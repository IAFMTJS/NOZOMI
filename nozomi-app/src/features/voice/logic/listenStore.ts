import { teardownRecordedListenTimers } from '@/features/voice/logic/recordedListenTimers'
import { cancelMicSession } from '@/features/voice/logic/micSessionRecorder'
import { getLastOfflineSttError, isOfflineSttReady } from '@/features/voice/logic/offlineStt'
import type { SttEngine } from '@/features/voice/logic/sttEngine'
import type { SpeechCallbacks } from '@/features/voice/logic/types'
import { voiceDebug, voiceDebugWarn } from '@/features/voice/logic/voiceDebug'

export type ListenSession = { stopped: boolean; gotResult: boolean }

let recognition: SpeechRecognition | null = null
let listenSession: ListenSession | null = null
let boundCallbacks: SpeechCallbacks | null = null
let pendingTranscript = ''
let lastDisplayTranscript = ''
let sessionTranscript = ''
let accumulatedFinal = ''
let listenArmedFromGesture = false
let listenGeneration = 0
let handlerEpoch = 0
let finishRequested = false
let finalizeRetryTimer: ReturnType<typeof setTimeout> | null = null
let finalizeWatchdogTimer: ReturnType<typeof setTimeout> | null = null
let signalAudioStart = false
let signalSoundStart = false
let signalSpeechStart = false
let activeSttEngine: SttEngine = 'local'
let activeListenLang = 'en-US'
let visualizerStop: (() => void) | null = null

let sttWorkTail: Promise<void> = Promise.resolve()

const STT_WORK_IDLE_MAX_MS = 8_000

export function whenSttWorkIdle(maxWaitMs = STT_WORK_IDLE_MAX_MS): Promise<void> {
  if (maxWaitMs <= 0) return sttWorkTail
  return new Promise((resolve) => {
    let settled = false
    let timer: number | undefined
    const finish = (timedOut: boolean) => {
      if (settled) return
      settled = true
      if (timer !== undefined) {
        clearTimeout(timer)
        timer = undefined
      }
      if (timedOut) {
        voiceDebugWarn('stt:work-idle-timeout', { maxWaitMs })
      }
      resolve()
    }
    timer = window.setTimeout(() => finish(true), maxWaitMs)
    void sttWorkTail.then(
      () => finish(false),
      () => finish(false),
    )
  })
}

export function enqueueSttWork<T>(fn: () => Promise<T>): Promise<T> {
  const run = sttWorkTail.then(fn, fn)
  sttWorkTail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function getRecognition(): SpeechRecognition | null {
  return recognition
}

export function setRecognition(rec: SpeechRecognition | null): void {
  recognition = rec
}

export function getListenSession(): ListenSession | null {
  return listenSession
}

export function setListenSession(session: ListenSession | null): void {
  listenSession = session
}

export function getListenGeneration(): number {
  return listenGeneration
}

export function bumpListenGeneration(): number {
  return ++listenGeneration
}

export function getActiveSttEngine(): SttEngine {
  return activeSttEngine
}

export function setActiveSttEngine(engine: SttEngine): void {
  activeSttEngine = engine
}

export function getActiveListenLang(): string {
  return activeListenLang
}

export function setActiveListenLang(lang: string): void {
  activeListenLang = lang
}

export function isFinishRequested(): boolean {
  return finishRequested
}

export function setFinishRequested(value: boolean): void {
  finishRequested = value
}

export function getAccumulatedFinal(): string {
  return accumulatedFinal
}

export function setAccumulatedFinal(text: string): void {
  accumulatedFinal = text
}

export function appendAccumulatedFinal(text: string): void {
  accumulatedFinal += text
}

export function setPendingTranscript(text: string): void {
  pendingTranscript = text
}

export function setSignalAudioStart(value = true): void {
  signalAudioStart = value
}

export function setSignalSoundStart(value = true): void {
  signalSoundStart = value
}

export function setSignalSpeechStart(value = true): void {
  signalSpeechStart = value
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

export function resetListenSignals(): void {
  signalAudioStart = false
  signalSoundStart = false
  signalSpeechStart = false
}

export function isListenSessionActive(): boolean {
  return !!listenSession && !listenSession.stopped && !listenSession.gotResult
}

export function getSttDebugState(): Record<string, unknown> {
  return {
    listenGeneration,
    handlerEpoch,
    finishRequested,
    session: listenSession ? { ...listenSession } : null,
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

export function syncCaptureFromDisplay(text: string): void {
  const t = text.trim()
  if (!t) return
  sessionTranscript = t
  lastDisplayTranscript = t
  if (!pendingTranscript) pendingTranscript = t
  if (!accumulatedFinal) accumulatedFinal = t
}

export function rememberTranscript(display: string): void {
  const t = display.trim()
  if (!t) return
  sessionTranscript = t
  lastDisplayTranscript = t
}

export function clearTranscriptBuffers(): void {
  pendingTranscript = ''
  lastDisplayTranscript = ''
  sessionTranscript = ''
  accumulatedFinal = ''
}

export function clearSessionTranscriptOnly(): void {
  sessionTranscript = ''
  accumulatedFinal = ''
}

export function dispatch<K extends keyof SpeechCallbacks>(
  cb: K,
  ...args: Parameters<NonNullable<SpeechCallbacks[K]>>
): void {
  const fn = boundCallbacks?.[cb]
  if (typeof fn === 'function') {
    ;(fn as (...a: unknown[]) => void)(...args)
  }
}

function isHandlerLive(epoch: number): boolean {
  return epoch === handlerEpoch
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
    onFinalizeFailed: callbacks.onFinalizeFailed
      ? (err) => {
          if (isHandlerLive(epoch)) callbacks.onFinalizeFailed?.(err)
        }
      : undefined,
    onLevel: callbacks.onLevel
      ? (level) => {
          if (isHandlerLive(epoch)) callbacks.onLevel?.(level)
        }
      : undefined,
  }
}

export function attachListeningCallbacks(callbacks: SpeechCallbacks): boolean {
  if (!listenSession) return false
  bindListeningHandlers(callbacks)
  return true
}

export function invalidateHandlers(): void {
  handlerEpoch++
  boundCallbacks = null
}

export function getBoundOnLevel(): ((n: number) => void) | undefined {
  return boundCallbacks?.onLevel
}

export function clearFinalizeTimers(): void {
  if (finalizeRetryTimer) {
    clearTimeout(finalizeRetryTimer)
    finalizeRetryTimer = null
  }
  if (finalizeWatchdogTimer) {
    clearTimeout(finalizeWatchdogTimer)
    finalizeWatchdogTimer = null
  }
}

export function setFinalizeWatchdog(timer: ReturnType<typeof setTimeout> | null): void {
  finalizeWatchdogTimer = timer
}

/** Mark turn complete with no transcript (triggers no-speech UI path). */
export function commitEmptyTranscript(sessionGen: number): void {
  if (listenGeneration !== sessionGen || !listenSession || listenSession.gotResult) {
    return
  }
  listenSession.gotResult = true
  listenSession.stopped = true
  clearFinalizeTimers()
  voiceDebug('stt:commit-empty', { generation: sessionGen })
  dispatch('onResult', '')
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

export function commitTranscript(text: string, sessionGen: number): void {
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
  clearFinalizeTimers()
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

export function stopMicVisualizer(): void {
  visualizerStop?.()
  visualizerStop = null
}

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

export function scheduleFinalizeCommit(sessionGen: number, attempt = 0): void {
  if (listenGeneration !== sessionGen || !listenSession || listenSession.gotResult) {
    return
  }

  if (finalizeRetryTimer) {
    clearTimeout(finalizeRetryTimer)
    finalizeRetryTimer = null
  }

  const text = getCapturedTranscript()
  if (text) {
    voiceDebug('stt:finalize-commit', { attempt, length: text.length })
    commitTranscript(text, sessionGen)
    return
  }

  if (attempt >= 24) {
    voiceDebugWarn('stt:finalize-gave-up', { attempt, ...getSttDebugState() })
    if (listenSession && !listenSession.gotResult) {
      listenSession.gotResult = true
      listenSession.stopped = true
      clearFinalizeTimers()
      dispatch('onStateChange', 'processing')
      dispatch('onResult', '')
    }
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

export function stopRecognitionSafe(): void {
  try {
    recognition?.stop()
  } catch {
    /* ignore */
  }
}

export function abortRecognitionSafe(): void {
  try {
    const rec = recognition as SpeechRecognition & { abort?: () => void }
    rec?.abort?.()
  } catch {
    /* ignore */
  }
}

export function resetListenSessionState(): void {
  teardownRecordedListenTimers()
  finishRequested = false
  clearFinalizeTimers()
  if (listenSession) listenSession.stopped = true
  clearTranscriptBuffers()
  resetListenSignals()
  stopRecognitionSafe()
  recognition = null
  cancelMicSession()
  listenSession = null
  stopMicVisualizer()
  invalidateHandlers()
}

export function markListenTurnHandledInStore(): void {
  if (listenSession) {
    listenSession.gotResult = true
    listenSession.stopped = true
  }
  finishRequested = false
  clearFinalizeTimers()
}
