import {
  beginMicRecording,
  startMicSession,
  stopMicSession,
} from '@/features/voice/logic/micSessionRecorder'
import {
  getLastOfflineSttError,
  isOfflineSttReady,
  preloadOfflineStt,
  transcribeAudioBlob,
  whenOfflineSttReady,
} from '@/features/voice/logic/offlineStt'
import { scheduleReleaseOfflineSttPipeline } from '@/features/voice/logic/offlineSttLifecycle'
import { transcribeCloudAudio } from '@/features/voice/logic/cloudStt'
import { useNozomiStore } from '@/store/useNozomiStore'
import {
  isMicRecentlyPrimed,
  micErrorFromUnknown,
} from '@/features/voice/logic/speechCapabilities'
import {
  bumpListenGeneration,
  commitEmptyTranscript,
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
  setFinishRequested,
  setListenSession,
  setRecognition,
  setSignalAudioStart,
  setSignalSoundStart,
  whenSttWorkIdle,
  bindListeningHandlers,
} from '@/features/voice/logic/listenStore'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import {
  browserSttAvailable,
  getSttEngine,
  setSessionSttEngine,
} from '@/features/voice/logic/sttEngine'
import { releaseSharedMicrophone } from '@/features/voice/logic/speechCapabilities'
import { releaseDecodeContext } from '@/features/voice/logic/audioDecode'
import { isIos } from '@/utils/device'

/** Let the mic stack settle before decode + WASM (reduces tab reloads on iOS). */
async function yieldBeforeTranscribe(): Promise<void> {
  releaseDecodeContext()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
  if (isIos()) {
    await new Promise((r) => setTimeout(r, 150))
  }
}

function unwindEmptyFinalize(generation: number): void {
  voiceDebugWarn('rec:finalize-unwind-empty', { generation })
  commitEmptyTranscript(generation)
}
import type { SpeechCallbacks, StartListeningOptions } from '@/features/voice/logic/types'
import {
  MAX_RECORDING_BLOB_BYTES,
  MAX_RECORDING_MS,
  MIC_SOUND_DETECT_THRESHOLD,
  STT_USER_TIMEOUT_MS,
} from '@/features/voice/context/speech-listen/constants'
import { promiseWithTimeout } from '@/features/voice/logic/promiseTimeout'
import {
  clearRecordedCaptureTimers,
  setRecordingCapTimer,
} from '@/features/voice/logic/recordedListenTimers'
import { setVoicePipelineStep } from '@/features/voice/logic/voicePipelineStep'
import { voiceDebug, voiceDebugError, voiceDebugWarn } from '@/features/voice/logic/voiceDebug'
import { startBrowserListening } from '@/features/voice/logic/browserSttListen'

function failRecordedFinalize(
  generation: number,
  reason: string,
  code: 'transcribe-failed' | 'network' | 'unknown' = 'transcribe-failed',
): void {
  if (getListenGeneration() !== generation) return
  const session = getListenSession()
  if (!session || session.gotResult) return
  session.stopped = true
  session.gotResult = true
  scheduleReleaseOfflineSttPipeline()
  voiceDebugError('rec:finalize-failed', { generation, reason, code })
  setVoicePipelineStep('error')
  dispatch('onFinalizeFailed', {
    code,
    message: reason,
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
  resetListenSessionState()
  releaseSharedMicrophone()
  startBrowserListening(callbacks, options)
  return true
}

function runRecordedFinalize(generation: number): void {
  clearRecordedCaptureTimers()
  setVoicePipelineStep('stopping-recorder')
  void stopMicSession()
    .then(async (blob) => {
      try {
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
          unwindEmptyFinalize(generation)
          return
        }
        dispatch('onStateChange', 'processing')
        if (!blob || blob.size < 128) {
          voiceDebugWarn('rec:blob-too-small', { size: blob?.size ?? 0 })
          unwindEmptyFinalize(generation)
          return
        }
        if (blob.size > MAX_RECORDING_BLOB_BYTES) {
          voiceDebugWarn('rec:blob-too-large', { size: blob.size })
          failRecordedFinalize(
            generation,
            'Recording was too large to process. Try a shorter message.',
          )
          return
        }

        setVoicePipelineStep('transcribing')
        await yieldBeforeTranscribe()
        if (getListenGeneration() !== generation || !getListenSession() || getListenSession()!.gotResult) {
          return
        }
        const { soundStart } = getListenSignals()
        const lang = getActiveListenLang()
        if (!isOfflineSttReady(lang)) {
          voiceDebug('rec:await-offline-stt', { lang, generation })
          await whenOfflineSttReady(lang)
        }
        if (getListenGeneration() !== generation || !getListenSession() || getListenSession()!.gotResult) {
          return
        }
        const text = await enqueueSttWork(() =>
          promiseWithTimeout(
            (async () => {
              const settings = useNozomiStore.getState().settings
              if (
                settings.sttCloudProvider === 'cloud' &&
                settings.cloudSttApiKey.trim()
              ) {
                const cloud = await transcribeCloudAudio(
                  settings.cloudSttApiKey,
                  blob,
                  lang,
                )
                if (cloud) return cloud
              }
              return transcribeAudioBlob(blob, lang, { hadSound: soundStart })
            })(),
            STT_USER_TIMEOUT_MS,
            'rec:transcribe',
          ),
        )
        scheduleReleaseOfflineSttPipeline()
        if (
          getListenGeneration() !== generation ||
          !getListenSession() ||
          getListenSession()!.gotResult
        ) {
          return
        }
        if (text.trim()) {
          setVoicePipelineStep('understanding')
          commitTranscript(text, generation)
        } else {
          const offlineErr = getLastOfflineSttError()
          voiceDebugWarn('rec:transcribe-empty', {
            offlineError: offlineErr?.slice(0, 200) ?? null,
          })
          if (offlineErr && !/silent/i.test(offlineErr)) {
            failRecordedFinalize(
              generation,
              'Could not process that audio. Please try again.',
              /timed out/i.test(offlineErr) ? 'network' : 'transcribe-failed',
            )
            return
          }
          if (
            browserSttAvailable() &&
            getSttEngine() === 'local' &&
            /timed out|silent/i.test(offlineErr ?? '')
          ) {
            setSessionSttEngine('browser')
            voiceDebugWarn('stt:next-turn-browser', { reason: 'local-transcribe-failed' })
          }
          dispatch('onResult', '')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const timedOut = /timed out/i.test(msg)
        failRecordedFinalize(
          generation,
          timedOut
            ? 'Transcription took too long. Check your connection and try again.'
            : 'Could not process that audio. Please try again.',
          timedOut ? 'network' : 'transcribe-failed',
        )
      }
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err)
      failRecordedFinalize(
        generation,
        msg || 'Recording could not be finalized.',
        'transcribe-failed',
      )
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
  const modelReadyAtStart = isOfflineSttReady(lang)
  let sttModelReady = modelReadyAtStart

  const tryStartCapture = () => {
    const session = getListenSession()
    if (getListenGeneration() !== generation || !session || session.stopped) return
    if (!micRecorderReady || captureStarted) return
    if (!sttModelReady) {
      voiceDebug('rec:wait-model-before-capture', { generation })
      return
    }
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
    setVoicePipelineStep('recording')
    clearRecordedCaptureTimers()
    setRecordingCapTimer(
      window.setTimeout(() => {
        if (getListenGeneration() !== generation) return
        const active = getListenSession()
        if (!active || active.stopped || active.gotResult) return
        voiceDebugWarn('rec:max-duration', { generation, maxMs: MAX_RECORDING_MS })
        active.stopped = true
        setFinishRequested(true)
        runRecordedFinalize(generation)
      }, MAX_RECORDING_MS),
    )
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

  const beginMicCapture = () => {
    const micStartDelayMs = isMicRecentlyPrimed() ? 280 : 0
    const run = () => void startMic().then(afterMicStart)
    if (micStartDelayMs > 0) {
      window.setTimeout(run, micStartDelayMs)
    } else {
      run()
    }
  }

  void whenOfflineSttReady(lang)
    .then(() => {
      window.clearTimeout(modelWaitTimer)
      const session = getListenSession()
      if (getListenGeneration() !== generation || !session || session.stopped) return
      sttModelReady = true
      voiceDebug('offline-stt:preload-done', { generation, lang })
      if (!micRecorderReady) beginMicCapture()
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
  setVoicePipelineStep('preparing')
  dispatch('onStateChange', 'permission_pending')

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
        if (level > MIC_SOUND_DETECT_THRESHOLD) setSignalSoundStart()
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

  if (modelReadyAtStart) {
    beginMicCapture()
  } else if (!isIos()) {
    beginMicCapture()
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

