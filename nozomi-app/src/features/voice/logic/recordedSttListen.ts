import {
  beginMicRecording,
  startMicSession,
  stopMicSession,
} from '@/systems/speech/micSessionRecorder'
import {
  getLastOfflineSttError,
  isOfflineSttReady,
  preloadOfflineStt,
  releaseOfflineSttPipeline,
  transcribeAudioBlob,
  whenOfflineSttReady,
} from '@/systems/speech/offlineStt'
import { transcribeCloudAudio } from '@/features/voice/logic/cloudStt'
import { useNozomiStore } from '@/store/useNozomiStore'
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
import { isIos } from '@/utils/device'
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
    const session = getListenSession()
    if (getListenGeneration() !== generation) {
      voiceDebugWarn('rec:finalize-gen-mismatch', {
        expected: generation,
        current: getListenGeneration(),
      })
      return
    }
    if (!session || session.gotResult) {
      voiceDebugWarn('rec:finalize-no-session', {
        hasSession: !!session,
        gotResult: session?.gotResult,
      })
      return
    }
    dispatch('onStateChange', 'processing')
    if (!blob || blob.size < 128) {
      voiceDebugWarn('rec:blob-too-small', { size: blob?.size ?? 0 })
      dispatch('onResult', '')
      return
    }
    const { soundStart } = getListenSignals()
    const lang = getActiveListenLang()
    const text = await enqueueSttWork(async () => {
      const settings = useNozomiStore.getState().settings
      if (settings.sttCloudProvider === 'cloud' && settings.cloudSttApiKey.trim()) {
        const cloud = await transcribeCloudAudio(
          settings.cloudSttApiKey,
          blob,
          lang,
        )
        if (cloud) return cloud
      }
      return transcribeAudioBlob(blob, lang, { hadSound: soundStart })
    })
    // Free Whisper WASM before conversation work — keeps mobile tabs alive after stop.
    releaseOfflineSttPipeline()
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
  preloadOfflineStt(lang, { force: true })

  let micRecorderReady = false
  let captureStarted = false
  let sttModelReady = isOfflineSttReady(lang)

  const tryStartCapture = () => {
    const session = getListenSession()
    if (getListenGeneration() !== generation || !session || session.stopped) return
    if (!micRecorderReady || captureStarted) return
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
    captureStarted = true
    setSignalAudioStart()
    voiceDebug('rec:ready', {
      generation,
      sttModelReady,
      captureWithoutModel: !sttModelReady,
    })
    dispatch('onStateChange', 'listening')
  }

  const modelWaitMs = isIos() ? 75_000 : 120_000
  const modelWaitTimer = window.setTimeout(() => {
    const session = getListenSession()
    if (getListenGeneration() !== generation || !session || session.stopped || sttModelReady) {
      return
    }
    const reason = getLastOfflineSttError() ?? 'Speech model is still loading'
    voiceDebugError('offline-stt:preload-timeout', { generation, lang, reason })
    if (tryBrowserSttFallback(callbacks, options, reason)) return
    session.stopped = true
    dispatch('onError', {
      code: 'start-failed',
      message:
        'Speech model could not load. Check your connection, wait a moment, and try again.',
    })
    dispatch('onStateChange', 'error')
  }, modelWaitMs)

  void whenOfflineSttReady(lang)
    .then(() => {
      window.clearTimeout(modelWaitTimer)
      const session = getListenSession()
      if (getListenGeneration() !== generation || !session || session.stopped) return
      sttModelReady = true
      voiceDebug('offline-stt:preload-done', { generation, lang })
      tryStartCapture()
    })
    .catch((err) => {
      window.clearTimeout(modelWaitTimer)
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
        tryStartCapture()
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
