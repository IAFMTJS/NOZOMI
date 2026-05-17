import {
  beginMicRecording,
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
  isMicRecentlyPrimed,
  micErrorFromUnknown,
} from '@/systems/speech/speechCapabilities'
import {
  bumpListenGeneration,
  commitTranscript,
  dispatch,
  enqueueSttWork,
  getActiveListenLang,
  getListenGeneration,
  getListenSession,
  getListenSignals,
  resetListenSessionState,
  setActiveListenLang,
  setActiveSttEngine,
  setListenSession,
  setRecognition,
  setSignalAudioStart,
  setSignalSoundStart,
  whenSttWorkIdle,
  bindListeningHandlers,
} from '@/systems/speech/listenStore'
import { resolveSpeechRecognitionLang } from '@/systems/speech/speechLocale'
import {
  browserSttAvailable,
  getSttEngine,
  setSessionSttEngine,
} from '@/systems/speech/sttEngine'
import { releaseSharedMicrophone } from '@/systems/speech/speechCapabilities'
import type { SpeechCallbacks, StartListeningOptions } from '@/systems/speech/types'
import { voiceDebug, voiceDebugError, voiceDebugWarn } from '@/systems/speech/voiceDebug'
import { startBrowserListening } from '@/systems/speech/browserSttListen'

function tryBrowserSttFallback(
  callbacks: SpeechCallbacks,
  options: StartListeningOptions,
  reason: string,
): boolean {
  if (!browserSttAvailable()) return false
  voiceDebugWarn('stt:fallback-browser', { reason: reason.slice(0, 240) })
  setSessionSttEngine('browser')
  resetListenSessionState()
  releaseSharedMicrophone()
  startBrowserListening(callbacks, options)
  return true
}

function runRecordedFinalize(generation: number): void {
  void stopMicSession().then(async (blob) => {
    if (
      getListenGeneration() !== generation ||
      !getListenSession() ||
      getListenSession()!.gotResult
    ) {
      return
    }
    dispatch('onStateChange', 'processing')
    if (!blob || blob.size < 128) {
      voiceDebugWarn('rec:blob-too-small', { size: blob?.size ?? 0 })
      dispatch('onResult', '')
      return
    }
    const { soundStart } = getListenSignals()
    const text = await enqueueSttWork(() =>
      transcribeAudioBlob(blob, getActiveListenLang(), { hadSound: soundStart }),
    )
    if (
      getListenGeneration() !== generation ||
      !getListenSession() ||
      getListenSession()!.gotResult
    ) {
      return
    }
    if (text.trim()) {
      commitTranscript(text, generation)
    } else {
      voiceDebugWarn('rec:transcribe-empty', {
        offlineError: getLastOfflineSttError()?.slice(0, 200) ?? null,
      })
      if (
        browserSttAvailable() &&
        getSttEngine() === 'local' &&
        /timed out|silent/i.test(getLastOfflineSttError() ?? '')
      ) {
        setSessionSttEngine('browser')
        voiceDebugWarn('stt:next-turn-browser', { reason: 'local-transcribe-failed' })
      }
      dispatch('onResult', '')
    }
  })
}

export function runRecordedFinalizeForGeneration(generation: number): void {
  runRecordedFinalize(generation)
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

  resetListenSessionState()
  releaseSharedMicrophone()
  bindListeningHandlers(callbacks)

  const generation = bumpListenGeneration()
  const lang = options.lang ?? resolveSpeechRecognitionLang('auto')
  setActiveSttEngine('local')
  setActiveListenLang(lang)
  setListenSession({ stopped: false, gotResult: false })
  setRecognition(null)
  preloadOfflineStt(lang)

  let micRecorderReady = false
  let sttModelReady = isOfflineSttReady(lang)

  const maybeStartListening = () => {
    const session = getListenSession()
    if (getListenGeneration() !== generation || !session || session.stopped) return
    if (micRecorderReady && sttModelReady) {
      if (!beginMicRecording(generation)) {
        voiceDebugWarn('rec:begin-failed', { generation })
        session.stopped = true
        dispatch('onError', {
          code: 'start-failed',
          message: 'Recording could not start',
        })
        dispatch('onStateChange', 'error')
        return
      }
      setSignalAudioStart()
      voiceDebug('rec:ready', { generation, sttModelReady: true })
      dispatch('onStateChange', 'listening')
    }
  }

  void whenOfflineSttReady(lang)
    .then(() => {
      const session = getListenSession()
      if (getListenGeneration() !== generation || !session || session.stopped) return
      sttModelReady = true
      voiceDebug('offline-stt:preload-done', { generation, lang })
      maybeStartListening()
    })
    .catch((err) => {
      const reason = err instanceof Error ? err.message : String(err)
      voiceDebugError('offline-stt:preload-blocked', { error: reason })
      if (
        getListenGeneration() === generation &&
        getListenSession() &&
        tryBrowserSttFallback(callbacks, options, reason)
      ) {
        return
      }
      const session = getListenSession()
      if (getListenGeneration() !== generation || !session) return
      session.stopped = true
      dispatch('onError', {
        code: 'start-failed',
        message: reason || 'Speech model failed to load',
      })
      dispatch('onStateChange', 'error')
    })

  voiceDebug('rec:session-start', { generation, lang })
  dispatch('onStateChange', 'permission_pending')

  const micStartDelayMs = isMicRecentlyPrimed() ? 280 : 0
  const startMic = () =>
    startMicSession(generation, {
      onReady: () => {
        const session = getListenSession()
        if (getListenGeneration() !== generation || !session || session.stopped) return
        micRecorderReady = true
        voiceDebug('rec:mic-ready', { generation, sttModelReady })
        maybeStartListening()
      },
      onLevel: (level) => {
        if (level > 0.04) setSignalSoundStart()
        dispatch('onLevel', level)
      },
      onError: (err) => {
        if (getListenGeneration() !== generation) return
        const session = getListenSession()
        if (!session) return
        session.stopped = true
        dispatch('onStateChange', 'error')
        dispatch('onError', micErrorFromUnknown(err))
      },
    })

  const afterMicStart = (ok: boolean) => {
    const session = getListenSession()
    if (!ok && getListenGeneration() === generation && session) {
      session.stopped = true
      dispatch('onStateChange', 'error')
      dispatch('onError', {
        code: 'no-device',
        message: 'Microphone could not be opened for recording',
      })
    }
  }

  if (micStartDelayMs > 0) {
    window.setTimeout(() => void startMic().then(afterMicStart), micStartDelayMs)
  } else {
    void startMic().then(afterMicStart)
  }
}

export function startRecordedListening(
  callbacks: SpeechCallbacks,
  options: StartListeningOptions = {},
): void {
  void whenSttWorkIdle().then(() => {
    startRecordedListeningNow(callbacks, options)
  })
}
