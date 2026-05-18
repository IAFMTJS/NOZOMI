import { runRecordedFinalizeForGeneration } from '@/features/voice/logic/recordedSttListen'
import {
  startBrowserListening,
  stopBrowserAudioLevel,
} from '@/features/voice/logic/browserSttListen'
import { startRecordedListening } from '@/features/voice/logic/recordedSttListen'
import {
  abortRecognitionSafe,
  bindListeningHandlers,
  bumpListenGeneration,
  clearSessionTranscriptOnly,
  dispatch,
  getActiveSttEngine,
  getCapturedTranscript,
  getListenGeneration,
  getListenSession,
  getSttDebugState,
  isFinishRequested,
  isListenSessionActive,
  markListenTurnHandledInStore,
  resetListenSessionState,
  scheduleFinalizeCommit,
  setFinalizeWatchdog,
  setFinishRequested,
  stopRecognitionSafe,
} from '@/features/voice/logic/listenStore'
import {
  acquireSharedMicrophone,
  clearSharedMicStreamIf,
  getSharedMicStream,
  releaseSharedMicrophone,
} from '@/features/voice/logic/speechCapabilities'
import { levelFromRms, rmsFromTimeDomain } from '@/features/voice/logic/audioLevel'
import {
  browserSttAvailable,
  browserSttViableForLang,
  clearSessionSttEngine,
  getSttEngine,
  readStoredSttEngine,
  resolveSttEngineForLang,
} from '@/features/voice/logic/sttEngine'
import { iosTrackResource } from '@/features/voice/logic/iosMemoryBudget'
import { isIos, isLowMemoryDevice } from '@/utils/device'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import type { SpeechCallbacks, StartListeningOptions } from '@/features/voice/logic/types'
import { voiceDebug, voiceDebugWarn } from '@/features/voice/logic/voiceDebug'
export {
  attachListeningCallbacks,
  bindListeningHandlers,
  getCapturedTranscript,
  getListenSession,
  getActiveSttEngine,
  getListenSignals,
  getPendingTranscript,
  getSttDebugState,
  isListenSessionActive,
  markListenArmedFromGesture,
  consumeListenArmedFromGesture,
  syncCaptureFromDisplay,
  whenSttWorkIdle,
} from '@/features/voice/logic/listenStore'

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

  const lang = options.lang ?? resolveSpeechRecognitionLang('auto')
  const stored = readStoredSttEngine()
  const preferred = getSttEngine()
  let engine = resolveSttEngineForLang(preferred, lang)
  // Whisper is heavy; use browser for live captions unless user explicitly chose on-device.
  if (
    engine === 'local' &&
    stored !== 'local' &&
    !isIos() &&
    !isLowMemoryDevice() &&
    browserSttAvailable() &&
    browserSttViableForLang(lang)
  ) {
    voiceDebug('stt:prefer-browser', { lang, preferred, stored })
    engine = 'browser'
  }
  if (engine === 'local') {
    startRecordedListening(callbacks, options)
    return
  }
  startBrowserListening(callbacks, options)
}

export function finalizeListening(): void {
  const session = getListenSession()
  if (!session || session.gotResult || session.stopped) {
    voiceDebug('stt:finalize-skip', {
      hasSession: !!session,
      gotResult: session?.gotResult,
      stopped: session?.stopped,
    })
    return
  }
  setFinishRequested(true)
  const generation = getListenGeneration()
  voiceDebug('stt:finalize', {
    engine: getActiveSttEngine(),
    captured: getCapturedTranscript().slice(0, 160),
    session,
    finishRequested: isFinishRequested(),
  })
  session.stopped = true

  if (getActiveSttEngine() === 'local') {
    runRecordedFinalizeForGeneration(generation)
    return
  }

  stopBrowserAudioLevel()
  scheduleFinalizeCommit(generation, 0)
  stopRecognitionSafe()
  setFinalizeWatchdog(
    setTimeout(() => {
      setFinalizeWatchdog(null)
      const current = getListenSession()
      if (getListenGeneration() === generation && current && !current.gotResult) {
        voiceDebugWarn('stt:onend-watchdog', { generation })
        abortRecognitionSafe()
        scheduleFinalizeCommit(generation, 0)
      }
    }, 450),
  )
}

function teardownListenSession(options?: { releaseMic?: boolean }): void {
  stopBrowserAudioLevel()
  bumpListenGeneration()
  resetListenSessionState()
  clearSessionSttEngine()
  if (options?.releaseMic !== false) {
    releaseSharedMicrophone()
  }
}

/** Drop a completed or aborted session so the next orb tap can open a fresh STT session. */
export function clearStaleListenSession(): void {
  const session = getListenSession()
  if (!session || isListenSessionActive()) return
  voiceDebugWarn('stt:clear-stale-session', {
    stopped: session.stopped,
    gotResult: session.gotResult,
  })
  bumpListenGeneration()
  resetListenSessionState()
}

export function cancelListening(): void {
  voiceDebug('stt:cancel', getSttDebugState())
  teardownListenSession({ releaseMic: true })
}

export function markListenTurnHandled(): void {
  markListenTurnHandledInStore()
}

export function endListenSessionAfterTurn(options?: { keepMic?: boolean }): void {
  clearSessionTranscriptOnly()
  teardownListenSession({ releaseMic: !options?.keepMic })
}

export function stopListening(): void {
  cancelListening()
}

export function createAudioLevelLoop(
  onLevel: (n: number) => void,
): { start: () => Promise<void>; stop: () => void } {
  let raf = 0
  let ctx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let ownedStream: MediaStream | null = null
  const fftSize = isIos() ? 128 : 256
  const data = new Uint8Array(fftSize)

  const tick = () => {
    if (!analyser) return
    analyser.getByteTimeDomainData(data)
    onLevel(levelFromRms(rmsFromTimeDomain(data), 4))
    raf = requestAnimationFrame(tick)
  }

  return {
    start: async () => {
      try {
        let stream = getSharedMicStream()
        if (!stream?.active) {
          stream = await acquireSharedMicrophone()
          if (stream) ownedStream = stream
        }
        if (!stream) {
          onLevel(0)
          return
        }
        ctx = new AudioContext()
        if (ctx.state === 'suspended') await ctx.resume()
        const source = ctx.createMediaStreamSource(stream)
        analyser = ctx.createAnalyser()
        analyser.fftSize = fftSize
        source.connect(analyser)
        if (isIos()) iosTrackResource('browser-level', true)
        tick()
      } catch {
        onLevel(0)
      }
    },
    stop: () => {
      cancelAnimationFrame(raf)
      const closing = ctx
      ctx = null
      analyser = null
      iosTrackResource('browser-level', false)
      void (async () => {
        if (closing && closing.state !== 'closed') {
          try {
            await closing.close()
          } catch {
            /* ignore */
          }
        }
      })()
      onLevel(0)
      if (ownedStream) {
        ownedStream.getTracks().forEach((t) => t.stop())
        clearSharedMicStreamIf(ownedStream)
        ownedStream = null
      }
    },
  }
}
