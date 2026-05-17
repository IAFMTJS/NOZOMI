import type { SpeechState } from '@/types/domain'
import {
  beginMicRecording,
  cancelMicSession,
  startMicSession,
  stopMicSession,
} from '@/systems/speech/micSessionRecorder'
import {
  getLastOfflineSttError,
  isOfflineSttReady,
  preloadOfflineStt,
  transcribeAudioBlob,
  whenOfflineSttReady,
} from '@/systems/speech/offlineStt'
import {
  browserSttAvailable,
  clearSessionSttEngine,
  getSttEngine,
  setSessionSttEngine,
  type SttEngine,
} from '@/systems/speech/sttEngine'
import { resolveSpeechRecognitionLang } from '@/systems/speech/speechLocale'
import { voiceDebug, voiceDebugError, voiceDebugWarn } from '@/systems/speech/voiceDebug'

export type SpeechErrorCode =
  | 'not-supported'
  | 'not-allowed'
  | 'no-device'
  | 'network'
  | 'busy'
  | 'start-failed'
  | 'unknown'

export type SpeechError = {
  code: SpeechErrorCode
  message: string
}

type SpeechCallbacks = {
  onResult: (text: string) => void
  onInterim?: (text: string) => void
  onStateChange: (state: SpeechState) => void
  onLevel?: (level: number) => void
  onError?: (error: SpeechError) => void
}

export type StartListeningOptions = {
  /** BCP-47 tag, e.g. ja-JP or en-US */
  lang?: string
}

let recognition: SpeechRecognition | null = null
let synthUtterance: SpeechSynthesisUtterance | null = null
let listenSession: { stopped: boolean; gotResult: boolean } | null = null
let boundCallbacks: SpeechCallbacks | null = null
let pendingTranscript = ''
/** Latest interim + final text shown in UI. */
let lastDisplayTranscript = ''
/** Survives until the next startListening (Stop reads this). */
let sessionTranscript = ''
/** Accumulated final segments for the active recognition session. */
let accumulatedFinal = ''
let listenArmedFromGesture = false
let listenGeneration = 0
let handlerEpoch = 0

let sharedMicStream: MediaStream | null = null
let micAcquirePromise: Promise<MediaStream | null> | null = null
let visualizerStop: (() => void) | null = null
let finishRequested = false
let finalizeRetryTimer: ReturnType<typeof setTimeout> | null = null
let micPrimedAt = 0
let signalAudioStart = false
let signalSoundStart = false
let signalSpeechStart = false
let activeSttEngine: SttEngine = 'local'
let activeListenLang = 'en-US'
let finalizeWatchdogTimer: ReturnType<typeof setTimeout> | null = null

/** Serializes Whisper transcribe jobs so a new listen turn cannot overlap on mobile. */
let sttWorkTail: Promise<void> = Promise.resolve()

export function whenSttWorkIdle(): Promise<void> {
  return sttWorkTail
}

function enqueueSttWork<T>(fn: () => Promise<T>): Promise<T> {
  const run = sttWorkTail.then(fn, fn)
  sttWorkTail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function getListenSignals(): {
  audioStart: boolean
  soundStart: boolean
  speechStart: boolean
} {
  return {
    audioStart: signalAudioStart,
    soundStart: signalSoundStart,
    speechStart: signalSpeechStart,
  }
}

function resetListenSignals(): void {
  signalAudioStart = false
  signalSoundStart = false
  signalSpeechStart = false
}

const MIC_PRIME_TTL_MS = 45_000

export function markMicPrimed(): void {
  micPrimedAt = Date.now()
}

function isMicRecentlyPrimed(): boolean {
  return Date.now() - micPrimedAt < MIC_PRIME_TTL_MS
}

export function isListenSessionActive(): boolean {
  return !!listenSession && !listenSession.stopped && !listenSession.gotResult
}

/** Console diagnostics — call `nozomiVoiceDump()` in devtools. */
export { isOfflineSttReady, whenOfflineSttReady }

export function getSttDebugState(): Record<string, unknown> {
  return {
    listenGeneration,
    handlerEpoch,
    finishRequested,
    micPrimedAgeMs: micPrimedAt ? Date.now() - micPrimedAt : null,
    session: listenSession
      ? { ...listenSession }
      : null,
    buffers: {
      pendingTranscript,
      lastDisplayTranscript,
      sessionTranscript,
      accumulatedFinal,
      captured: getCapturedTranscript(),
    },
    recognitionLang: recognition?.lang ?? activeListenLang,
    hasRecognition: !!recognition,
    sttEngine: activeSttEngine,
    offlineSttError: getLastOfflineSttError(),
    offlineSttReady: isOfflineSttReady(activeListenLang),
    signals: getListenSignals(),
  }
}

export function getPendingTranscript(): string {
  return pendingTranscript.trim()
}

export function getCapturedTranscript(): string {
  return (
    sessionTranscript ||
    lastDisplayTranscript ||
    pendingTranscript ||
    accumulatedFinal
  ).trim()
}

export function markListenArmedFromGesture(): void {
  listenArmedFromGesture = true
}

export function consumeListenArmedFromGesture(): boolean {
  const armed = listenArmedFromGesture
  listenArmedFromGesture = false
  return armed
}

/** Push UI transcript into the capture buffer before finalize (Stop button). */
export function syncCaptureFromDisplay(text: string): void {
  const t = text.trim()
  if (!t) return
  sessionTranscript = t
  lastDisplayTranscript = t
  if (!pendingTranscript) pendingTranscript = t
  if (!accumulatedFinal) accumulatedFinal = t
}

function rememberTranscript(display: string): void {
  const t = display.trim()
  if (!t) return
  sessionTranscript = t
  lastDisplayTranscript = t
}

function clearFinalizeRetry(): void {
  if (finalizeRetryTimer) {
    clearTimeout(finalizeRetryTimer)
    finalizeRetryTimer = null
  }
  if (finalizeWatchdogTimer) {
    clearTimeout(finalizeWatchdogTimer)
    finalizeWatchdogTimer = null
  }
}

export function micNeedsSecureContext(): boolean {
  return typeof window !== 'undefined' && !window.isSecureContext
}

export function speechSupported(): {
  stt: boolean
  tts: boolean
  needsHttps: boolean
} {
  const w = window as Window & {
    SpeechRecognition?: typeof SpeechRecognition
    webkitSpeechRecognition?: typeof SpeechRecognition
  }
  const browserStt = Boolean(
    w.SpeechRecognition ?? w.webkitSpeechRecognition,
  )
  const localStt =
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  const canStt = browserStt || localStt
  return {
    stt: canStt,
    tts: 'speechSynthesis' in window,
    needsHttps: canStt && micNeedsSecureContext(),
  }
}

export function micErrorFromUnknown(err: unknown): SpeechError {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return {
          code: 'not-allowed',
          message: 'Microphone permission denied',
        }
      case 'NotFoundError':
        return {
          code: 'no-device',
          message: 'No microphone device found',
        }
      case 'NotReadableError':
      case 'AbortError':
        return {
          code: 'busy',
          message: 'Microphone is in use by another app or could not be opened',
        }
      default:
        break
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return { code: 'unknown', message: err.message }
  }
  return { code: 'unknown', message: 'Microphone could not be opened' }
}

function mapSpeechError(code: string): SpeechError {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return {
        code: 'not-allowed',
        message: 'Microphone permission denied for speech recognition',
      }
    case 'network':
      return {
        code: 'network',
        message: 'Speech recognition needs an internet connection (Chrome/Edge)',
      }
    case 'audio-capture':
      return {
        code: 'no-device',
        message: 'Microphone is in use by another app or could not be opened',
      }
    case 'aborted':
      return { code: 'busy', message: 'Speech recognition was interrupted' }
    default:
      return { code: 'unknown', message: `Recognition failed (${code})` }
  }
}

function dispatch(cb: keyof SpeechCallbacks, ...args: unknown[]) {
  const fn = boundCallbacks?.[cb]
  if (typeof fn === 'function') {
    ;(fn as (...a: unknown[]) => void)(...args)
  }
}

function isHandlerLive(epoch: number): boolean {
  return epoch === handlerEpoch
}

/** Request mic permission then release the device so SpeechRecognition can capture audio. */
export async function primeMicrophonePermission(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return false
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((t) => t.stop())
    sharedMicStream = null
    markMicPrimed()
    return true
  } catch {
    return false
  }
}

/** @deprecated Use primeMicrophonePermission — kept for compatibility */
export async function prepareMicrophone(): Promise<boolean> {
  return primeMicrophonePermission()
}

export async function acquireSharedMicrophone(): Promise<MediaStream | null> {
  if (sharedMicStream?.active) return sharedMicStream
  if (!navigator.mediaDevices?.getUserMedia) return null
  if (!micAcquirePromise) {
    micAcquirePromise = navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        sharedMicStream = stream
        return stream
      })
      .catch(() => null)
      .finally(() => {
        micAcquirePromise = null
      })
  }
  return micAcquirePromise
}

export function releaseSharedMicrophone(): void {
  sharedMicStream?.getTracks().forEach((t) => t.stop())
  sharedMicStream = null
}

export function bindListeningHandlers(callbacks: SpeechCallbacks): void {
  const epoch = handlerEpoch
  boundCallbacks = {
    onResult: (text) => {
      if (isHandlerLive(epoch)) callbacks.onResult(text)
    },
    onInterim: callbacks.onInterim
      ? (text) => {
          if (isHandlerLive(epoch)) callbacks.onInterim?.(text)
        }
      : undefined,
    onStateChange: (state) => {
      if (isHandlerLive(epoch)) callbacks.onStateChange(state)
    },
    onError: (err) => {
      if (isHandlerLive(epoch)) callbacks.onError?.(err)
    },
    onLevel: callbacks.onLevel
      ? (level) => {
          if (isHandlerLive(epoch)) callbacks.onLevel?.(level)
        }
      : undefined,
  }
}

export function attachListeningCallbacks(callbacks: SpeechCallbacks): boolean {
  if (!isListenSessionActive()) return false
  bindListeningHandlers(callbacks)
  return true
}

function invalidateHandlers(): void {
  handlerEpoch++
  boundCallbacks = null
}

function commitTranscript(text: string, sessionGen: number): void {
  const trimmed = text.trim()
  if (
    !trimmed ||
    listenGeneration !== sessionGen ||
    !listenSession ||
    listenSession.gotResult
  ) {
    return
  }
  listenSession.gotResult = true
  listenSession.stopped = true
  clearFinalizeRetry()
  voiceDebug('stt:commit', {
    generation: sessionGen,
    length: trimmed.length,
    text: trimmed.slice(0, 160),
  })
  dispatch('onStateChange', 'processing')
  dispatch('onResult', trimmed)
  pendingTranscript = ''
  lastDisplayTranscript = ''
  sessionTranscript = ''
  accumulatedFinal = ''
  try {
    recognition?.stop()
  } catch {
    /* ignore */
  }
  stopMicVisualizer()
}

function stopMicVisualizer(): void {
  visualizerStop?.()
  visualizerStop = null
}

/** Orb waveform while STT runs — synthetic levels (mic is owned by SpeechRecognition). */
export function startMicVisualizer(onLevel: (n: number) => void): void {
  stopMicVisualizer()
  let raf = 0
  let phase = 0
  const tick = () => {
    phase += 0.11
    onLevel(0.1 + Math.max(0, Math.sin(phase)) * 0.22)
    raf = requestAnimationFrame(tick)
  }
  tick()
  visualizerStop = () => {
    cancelAnimationFrame(raf)
    onLevel(0)
  }
}

function scheduleFinalizeCommit(sessionGen: number, attempt = 0): void {
  if (listenGeneration !== sessionGen || !listenSession || listenSession.gotResult) {
    return
  }

  const text = getCapturedTranscript()
  if (text) {
    voiceDebug('stt:finalize-commit', { attempt, length: text.length })
    commitTranscript(text, sessionGen)
    return
  }

  if (attempt >= 15) {
    voiceDebugWarn('stt:finalize-gave-up', { attempt, ...getSttDebugState() })
    dispatch('onResult', '')
    return
  }

  if (attempt === 0 || attempt % 4 === 0) {
    voiceDebug('stt:finalize-retry', { attempt })
  }

  finalizeRetryTimer = setTimeout(
    () => scheduleFinalizeCommit(sessionGen, attempt + 1),
    50 + attempt * 50,
  )
}

function runRecordedFinalize(generation: number): void {
  void stopMicSession().then(async (blob) => {
    if (listenGeneration !== generation || !listenSession || listenSession.gotResult) {
      return
    }
    dispatch('onStateChange', 'processing')
    if (!blob || blob.size < 500) {
      voiceDebugWarn('rec:blob-too-small', { size: blob?.size ?? 0 })
      dispatch('onResult', '')
      return
    }
    const text = await enqueueSttWork(() =>
      transcribeAudioBlob(blob, activeListenLang),
    )
    if (listenGeneration !== generation || !listenSession || listenSession.gotResult) {
      return
    }
    if (text.trim()) {
      commitTranscript(text, generation)
    } else {
      voiceDebugWarn('rec:transcribe-empty')
      dispatch('onResult', '')
    }
  })
}

function tryBrowserSttFallback(
  callbacks: SpeechCallbacks,
  options: StartListeningOptions,
  reason: string,
): boolean {
  if (!browserSttAvailable()) return false
  voiceDebugWarn('stt:fallback-browser', { reason: reason.slice(0, 240) })
  setSessionSttEngine('browser')
  cancelListening()
  startBrowserListening(callbacks, options)
  return true
}

function startRecordedListening(
  callbacks: SpeechCallbacks,
  options: StartListeningOptions = {},
): void {
  void whenSttWorkIdle().then(() => {
    startRecordedListeningNow(callbacks, options)
  })
}

function startRecordedListeningNow(
  callbacks: SpeechCallbacks,
  options: StartListeningOptions = {},
): void {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    dispatch('onError', {
      code: 'not-supported',
      message: 'Microphone recording not supported in this browser',
    })
    dispatch('onStateChange', 'error')
    return
  }

  cancelListening()
  pendingTranscript = ''
  lastDisplayTranscript = ''
  sessionTranscript = ''
  accumulatedFinal = ''
  resetListenSignals()
  bindListeningHandlers(callbacks)

  const generation = ++listenGeneration
  activeSttEngine = 'local'
  activeListenLang = options.lang ?? resolveSpeechRecognitionLang('auto')
  listenSession = { stopped: false, gotResult: false }
  recognition = null
  preloadOfflineStt(activeListenLang)

  let micRecorderReady = false
  let sttModelReady = isOfflineSttReady(activeListenLang)

  const maybeStartListening = () => {
    if (listenGeneration !== generation || !listenSession || listenSession.stopped) {
      return
    }
    if (micRecorderReady && sttModelReady) {
      if (!beginMicRecording(generation)) {
        voiceDebugWarn('rec:begin-failed', { generation })
        if (listenSession) listenSession.stopped = true
        dispatch('onError', {
          code: 'start-failed',
          message: 'Recording could not start',
        })
        dispatch('onStateChange', 'error')
        return
      }
      signalAudioStart = true
      voiceDebug('rec:ready', { generation, sttModelReady: true })
      dispatch('onStateChange', 'listening')
    }
  }

  void whenOfflineSttReady(activeListenLang)
    .then(() => {
      if (listenGeneration !== generation || !listenSession || listenSession.stopped) {
        return
      }
      sttModelReady = true
      voiceDebug('offline-stt:preload-done', { generation, lang: activeListenLang })
      maybeStartListening()
    })
    .catch((err) => {
      const reason = err instanceof Error ? err.message : String(err)
      voiceDebugError('offline-stt:preload-blocked', { error: reason })
      if (
        listenGeneration === generation &&
        listenSession &&
        tryBrowserSttFallback(callbacks, options, reason)
      ) {
        return
      }
      if (listenGeneration !== generation || !listenSession) return
      listenSession.stopped = true
      dispatch('onError', {
        code: 'start-failed',
        message: reason || 'Speech model failed to load',
      })
      dispatch('onStateChange', 'error')
    })

  voiceDebug('rec:session-start', { generation, lang: activeListenLang })
  dispatch('onStateChange', 'permission_pending')

  const micStartDelayMs = isMicRecentlyPrimed() ? 280 : 0
  const startMic = () =>
    startMicSession(generation, {
      onReady: () => {
        if (listenGeneration !== generation || !listenSession || listenSession.stopped) {
          return
        }
        micRecorderReady = true
        voiceDebug('rec:mic-ready', { generation, sttModelReady })
        maybeStartListening()
      },
      onLevel: (level) => {
        if (level > 0.1) signalSoundStart = true
        dispatch('onLevel', level)
      },
      onError: (err) => {
        if (listenGeneration !== generation) return
        listenSession!.stopped = true
        dispatch('onStateChange', 'error')
        dispatch('onError', micErrorFromUnknown(err))
      },
    })

  const afterMicStart = (ok: boolean) => {
    if (!ok && listenGeneration === generation && listenSession) {
      listenSession.stopped = true
      dispatch('onStateChange', 'error')
      dispatch('onError', {
        code: 'no-device',
        message: 'Microphone could not be opened for recording',
      })
    }
  }

  if (micStartDelayMs > 0) {
    window.setTimeout(() => {
      void startMic().then(afterMicStart)
    }, micStartDelayMs)
  } else {
    void startMic().then(afterMicStart)
  }
}

function startBrowserListening(
  callbacks: SpeechCallbacks,
  options: StartListeningOptions = {},
): void {
  const w = window as Window & {
    SpeechRecognition?: typeof SpeechRecognition
    webkitSpeechRecognition?: typeof SpeechRecognition
  }
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!SR) {
    dispatch('onError', {
      code: 'not-supported',
      message: 'Speech recognition not supported — use Chrome or Edge',
    })
    dispatch('onStateChange', 'error')
    return
  }

  if (!window.isSecureContext) {
    dispatch('onError', {
      code: 'not-allowed',
      message: 'Microphone requires HTTPS or localhost',
    })
    dispatch('onStateChange', 'error')
    return
  }

  cancelListening()
  pendingTranscript = ''
  lastDisplayTranscript = ''
  sessionTranscript = ''
  accumulatedFinal = ''
  resetListenSignals()
  bindListeningHandlers(callbacks)

  const generation = ++listenGeneration
  activeSttEngine = 'browser'
  activeListenLang = options.lang ?? resolveSpeechRecognitionLang('auto')
  listenSession = { stopped: false, gotResult: false }
  recognition = new SR()
  recognition.lang = activeListenLang
  voiceDebug('stt:start', {
    generation,
    lang: recognition.lang,
    micPrimed: isMicRecentlyPrimed(),
    secure: window.isSecureContext,
  })
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 3

  const isActive = (): boolean =>
    listenGeneration === generation &&
    !!listenSession &&
    !listenSession.stopped &&
    !listenSession.gotResult

  recognition.onaudiostart = () => {
    signalAudioStart = true
    voiceDebug('stt:audiostart', { generation })
  }
  recognition.onsoundstart = () => {
    signalSoundStart = true
    voiceDebug('stt:soundstart', { generation })
  }
  recognition.onspeechstart = () => {
    signalSpeechStart = true
    voiceDebug('stt:speechstart', { generation })
  }
  recognition.onspeechend = () => {
    voiceDebug('stt:speechend', { generation })
  }
  recognition.onnomatch = () => {
    voiceDebugWarn('stt:nomatch', { generation })
  }

  recognition.onstart = () => {
    if (!isActive()) return
    voiceDebug('stt:onstart', { generation })
    dispatch('onStateChange', 'listening')
    if (boundCallbacks?.onLevel) {
      startMicVisualizer(boundCallbacks.onLevel)
    }
  }

  recognition.onend = () => {
    if (finishRequested) {
      finishRequested = false
      voiceDebug('stt:onend-finish', {
        generation,
        captured: getCapturedTranscript().slice(0, 160),
        signals: getListenSignals(),
      })
      if (listenSession && !listenSession.gotResult) {
        scheduleFinalizeCommit(generation, 0)
      }
      return
    }
    if (!isActive()) {
      voiceDebug('stt:onend-idle', { generation, gotResult: listenSession?.gotResult })
      stopMicVisualizer()
      if (!listenSession?.gotResult && !finishRequested) {
        dispatch('onStateChange', 'idle')
      }
      return
    }
    const captured = getCapturedTranscript()
    if (captured) {
      voiceDebug('stt:onend-commit', { generation, length: captured.length })
      commitTranscript(captured, generation)
      return
    }
    voiceDebug('stt:onend-restart', { generation, signals: getListenSignals() })
    try {
      recognition?.start()
    } catch {
      voiceDebugWarn('stt:onend-restart-failed', { generation })
      stopMicVisualizer()
      dispatch('onStateChange', 'idle')
    }
  }

  recognition.onerror = (ev) => {
    const code = ev.error
    if (code === 'no-speech') {
      voiceDebug('stt:no-speech', {
        finishRequested,
        stopped: listenSession?.stopped,
        signals: getListenSignals(),
      })
      if (finishRequested || listenSession?.stopped) {
        scheduleFinalizeCommit(generation, 0)
        return
      }
      return
    }
    if (code === 'aborted') {
      voiceDebug('stt:aborted', { generation })
      return
    }
    if (!isActive()) return
    voiceDebugError('stt:error', { code, generation })
    listenSession!.stopped = true
    stopMicVisualizer()
    dispatch('onStateChange', 'error')
    dispatch('onError', mapSpeechError(code))
  }

  recognition.onresult = (ev) => {
    let interim = ''
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const chunk = ev.results[i]
      const text = chunk[0]?.transcript ?? ''
      if (chunk.isFinal) accumulatedFinal += text
      else interim = text
    }
    pendingTranscript = accumulatedFinal.trim()
    const display = `${accumulatedFinal}${interim}`.trim()
    rememberTranscript(display)
    if (!display) return
    if (finishRequested && listenSession && !listenSession.gotResult) {
      voiceDebug('stt:onresult-finish-commit', {
        length: display.length,
        finalsLen: accumulatedFinal.length,
      })
      commitTranscript(display, generation)
      return
    }
    voiceDebug('stt:interim', {
      length: display.length,
      resultIndex: ev.resultIndex,
      results: ev.results.length,
    })
    dispatch('onInterim', display)
  }

  dispatch('onStateChange', 'permission_pending')

  const tryStart = (): boolean => {
    if (!isActive() || !recognition) return false
    try {
      recognition.start()
      return true
    } catch {
      return false
    }
  }

  const scheduleStartAttempts = () => {
    let attempts = 0
    const attempt = () => {
      if (!isActive()) return
      if (tryStart()) return
      attempts += 1
      if (attempts < 5) {
        window.setTimeout(attempt, 80 * attempts)
        return
      }
      listenSession!.stopped = true
      dispatch('onStateChange', 'error')
      dispatch('onError', {
        code: 'start-failed',
        message: 'Could not start speech recognition — tap retry',
      })
    }
    window.setTimeout(attempt, 30)
  }

  // Do not open getUserMedia before SpeechRecognition — that often breaks capture on Windows.
  voiceDebug('stt:direct-start', { generation, micPrimed: isMicRecentlyPrimed() })
  if (tryStart()) return
  scheduleStartAttempts()
}

export function startListening(
  callbacks: SpeechCallbacks,
  options: StartListeningOptions = {},
): void {
  bindListeningHandlers(callbacks)

  if (!window.isSecureContext) {
    dispatch('onError', {
      code: 'not-allowed',
      message: 'Microphone requires HTTPS or localhost',
    })
    dispatch('onStateChange', 'error')
    return
  }

  if (getSttEngine() === 'local') {
    startRecordedListening(callbacks, options)
    return
  }
  startBrowserListening(callbacks, options)
}

/** Stop capture; caller should read transcript from UI / getCapturedTranscript first. */
export function finalizeListening(): void {
  if (!listenSession || listenSession.gotResult) {
    voiceDebug('stt:finalize-skip', {
      hasSession: !!listenSession,
      gotResult: listenSession?.gotResult,
    })
    return
  }
  finishRequested = true
  const generation = listenGeneration
  voiceDebug('stt:finalize', {
    engine: activeSttEngine,
    captured: getCapturedTranscript().slice(0, 160),
    session: listenSession,
    finishRequested,
  })
  listenSession.stopped = true

  if (activeSttEngine === 'local') {
    runRecordedFinalize(generation)
    return
  }

  stopMicVisualizer()
  scheduleFinalizeCommit(generation, 0)
  try {
    recognition?.stop()
  } catch {
    /* ignore */
  }
  finalizeWatchdogTimer = setTimeout(() => {
    finalizeWatchdogTimer = null
    if (
      listenGeneration === generation &&
      listenSession &&
      !listenSession.gotResult
    ) {
      voiceDebugWarn('stt:onend-watchdog', { generation })
      try {
        const rec = recognition as SpeechRecognition & { abort?: () => void }
        rec?.abort?.()
      } catch {
        /* ignore */
      }
      scheduleFinalizeCommit(generation, 0)
    }
  }, 450)
}

/** Discard session without processing (header close / leave page). */
export function cancelListening(): void {
  voiceDebug('stt:cancel', getSttDebugState())
  finishRequested = false
  clearFinalizeRetry()
  listenGeneration++
  if (listenSession) listenSession.stopped = true
  pendingTranscript = ''
  lastDisplayTranscript = ''
  sessionTranscript = ''
  accumulatedFinal = ''
  resetListenSignals()
  try {
    recognition?.stop()
  } catch {
    /* ignore */
  }
  recognition = null
  cancelMicSession()
  listenSession = null
  stopMicVisualizer()
  invalidateHandlers()
  clearSessionSttEngine()
}

export function markListenTurnHandled(): void {
  if (listenSession) {
    listenSession.gotResult = true
    listenSession.stopped = true
  }
  finishRequested = false
  clearFinalizeRetry()
}

export function endListenSessionAfterTurn(): void {
  sessionTranscript = ''
  accumulatedFinal = ''
  cancelListening()
}

/** @deprecated Use cancelListening or finalizeListening */
export function stopListening(): void {
  cancelListening()
}

function scoreJapaneseVoice(voice: SpeechSynthesisVoice): number {
  let score = 0
  if (voice.lang === 'ja-JP') score += 12
  else if (voice.lang.startsWith('ja')) score += 6
  if (voice.localService) score += 10
  const name = voice.name.toLowerCase()
  if (
    name.includes('kyoko') ||
    name.includes('otoya') ||
    name.includes('enhanced') ||
    name.includes('premium')
  ) {
    score += 14
  }
  if (name.includes('google') && name.includes('日本')) score += 6
  if (name.includes('compact') || name.includes('super-compact')) score -= 12
  return score
}

function pickJapaneseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const ja = voices.filter((v) => v.lang.startsWith('ja'))
  if (!ja.length) return undefined
  return [...ja].sort(
    (a, b) => scoreJapaneseVoice(b) - scoreJapaneseVoice(a),
  )[0]
}

export function speakJapanese(
  text: string,
  opts: { rate?: number; pitch?: number; onStart?: () => void; onEnd?: () => void },
): void {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  synthUtterance = new SpeechSynthesisUtterance(text)
  synthUtterance.lang = 'ja-JP'
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  synthUtterance.rate = opts.rate ?? (isMobile ? 0.92 : 1)
  synthUtterance.pitch = opts.pitch ?? (isMobile ? 1.02 : 1)
  synthUtterance.onstart = () => opts.onStart?.()
  synthUtterance.onend = () => opts.onEnd?.()

  const voice = pickJapaneseVoice()
  if (voice) synthUtterance.voice = voice

  const speak = () => {
    if (!synthUtterance) return
    const v = pickJapaneseVoice()
    if (v) synthUtterance.voice = v
    window.speechSynthesis.speak(synthUtterance)
  }

  if (window.speechSynthesis.getVoices().length === 0) {
    const onVoices = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
      speak()
    }
    window.speechSynthesis.addEventListener('voiceschanged', onVoices)
    window.speechSynthesis.getVoices()
    return
  }
  speak()
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel()
}

export function createAudioLevelLoop(
  onLevel: (n: number) => void,
): { start: () => Promise<void>; stop: () => void } {
  let raf = 0
  let ctx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let ownedStream: MediaStream | null = null
  const data = new Uint8Array(128)

  const tick = () => {
    if (!analyser) return
    analyser.getByteFrequencyData(data)
    const avg = data.reduce((a, b) => a + b, 0) / data.length
    onLevel(Math.min(1, avg / 128))
    raf = requestAnimationFrame(tick)
  }

  return {
    start: async () => {
      try {
        let stream = sharedMicStream
        if (!stream?.active) {
          stream = await acquireSharedMicrophone()
          if (stream) ownedStream = stream
        }
        if (!stream) {
          onLevel(0)
          return
        }
        ctx = new AudioContext()
        if (ctx.state === 'suspended') {
          await ctx.resume()
        }
        const source = ctx.createMediaStreamSource(stream)
        analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        tick()
      } catch {
        onLevel(0)
      }
    },
    stop: () => {
      cancelAnimationFrame(raf)
      void ctx?.close()
      ctx = null
      analyser = null
      onLevel(0)
      if (ownedStream) {
        ownedStream.getTracks().forEach((t) => t.stop())
        if (sharedMicStream === ownedStream) sharedMicStream = null
        ownedStream = null
      }
    },
  }
}
