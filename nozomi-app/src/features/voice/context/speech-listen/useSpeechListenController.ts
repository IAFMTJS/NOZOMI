import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOfflineSttPreload } from '@/features/voice/context/speech-listen/hooks/useOfflineSttPreload'
import { useVoiceContinuousListen } from '@/features/voice/context/speech-listen/hooks/useVoiceContinuousListen'
import { useVoiceFinishRecording } from '@/features/voice/context/speech-listen/hooks/useVoiceFinishRecording'
import { useVoicePipelineStuckRecovery } from '@/features/voice/context/speech-listen/hooks/useVoicePipelineStuckRecovery'
import { useVoiceSilenceEndpoint } from '@/features/voice/context/speech-listen/hooks/useVoiceSilenceEndpoint'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  MIC_LEVEL_HEARD_THRESHOLD,
  PERMISSION_PREPARE_TIMEOUT_MS,
  VOICE_TURN_TIMEOUT_MS,
} from '@/features/voice/context/speech-listen/constants'
import { getVoicePlatformTuning, isMobileDevice } from '@/utils/device'
import type { SpeechListenApi } from '@/features/voice/context/speech-listen/types'
import { useConversation } from '@/features/conversation'
import {
  isUiTranscriptPlaceholder,
  mergeHeardTranscript,
} from '@/features/voice/logic/voiceTranscript'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'
import { resetOrbAudioLevel, setOrbAudioLevel } from '@/features/orb/logic/orbAudioLevel'
import { getLastOfflineSttError } from '@/features/voice/logic/offlineStt'
import {
  cancelScheduledReleaseOfflineStt,
  touchOfflineSttPipeline,
} from '@/features/voice/logic/offlineSttLifecycle'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import {
  attachListeningCallbacks,
  cancelListening,
  clearStaleListenSession,
  endListenSessionAfterTurn,
  finalizeListening,
  getCapturedTranscript,
  getListenSession,
  getListenSignals,
  getSttDebugState,
  isListenSessionActive,
  markListenArmedFromGesture,
  markListenTurnHandled,
  micNeedsSecureContext,
  getSharedMicStream,
  markMicPrimed,
  primeMicrophonePermission,
  releaseGestureMicStream,
  releaseSharedMicrophone,
  speechSupported,
  startListening,
  startMicCaptureFromGesture,
  stopSpeaking,
  type SpeechError,
  type SpeechErrorCode,
} from '@/features/voice/logic/speechService'
import { hasActiveGestureMic } from '@/features/voice/logic/micGesture'
import { needsGestureLockedMic } from '@/utils/device'
import { clearTranscriptFinalizing } from '@/features/voice/logic/speechPresenceSync'
import {
  deriveVoiceTurnPhase,
  enterVoiceCapturing,
  enterVoiceError,
  enterVoiceFinalizing,
  enterVoiceGenerating,
  enterVoiceInterrupted,
  enterVoiceListenPrepare,
  enterVoiceUnderstanding,
  forceRecoverVoiceUi,
  syncIdleAfterVoiceTurn,
} from '@/features/voice/logic/voiceTurnCoordinator'
import { getSttEngine, resolveSttEngineForLang } from '@/features/voice/logic/sttEngine'
import {
  installVoiceDebugConsole,
  voiceDebug,
  voiceDebugError,
  voiceDebugWarn,
} from '@/features/voice/logic/voiceDebug'
import type { SpeechState } from '@/types/domain'
import {
  beginVoiceTurnMetrics,
  markVoiceSpan,
  summarizeLastVoiceTurn,
} from '@/features/voice/logic/voiceTurnMetrics'
import {
  startBargeInMonitor,
  stopBargeInMonitor,
} from '@/features/voice/logic/bargeInMonitor'
import { afterSpeechOutputForListen } from '@/features/voice/logic/startListenPipeline'
import { shouldKeepMicWarmOnListenPage } from '@/features/voice/logic/voiceSettings'
import { isAnyTtsOutputActive } from '@/features/voice/logic/ttsOutputState'
import { invalidateContinuousListen } from '@/features/voice/logic/voiceTurnBridge'
import {
  startWakeWordMonitor,
  stopWakeWordMonitor,
} from '@/features/voice/logic/labs/wakeWordMonitor'
export function useSpeechListenController(): SpeechListenApi {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const onListenPage = pathname === '/listen'
  const { sendUserMessage, deliverNozomi } = useConversation()
  const dataReady = useUiStore((s) => s.dataReady)
  const speechInputLang = useNozomiStore((s) => s.settings.speechInputLang)
  const appSettings = useNozomiStore((s) => s.settings)
  const labsWakeWord = appSettings.labsWakeWord
  const setOrbState = useUiStore((s) => s.setOrbState)
  const setSpeechState = useUiStore((s) => s.setSpeechState)
  const setAudioLevel = useUiStore((s) => s.setAudioLevel)
  const setLiveTranscript = useUiStore((s) => s.setLiveTranscript)
  const setTranscriptFinalizing = useUiStore((s) => s.setTranscriptFinalizing)
  const orbState = useUiStore((s) => s.orbState)
  const speechState = useUiStore((s) => s.speechState)
  const [errorCode, setErrorCode] = useState<SpeechErrorCode | undefined>()
  const [offlineSttReady, setOfflineSttReady] = useState(false)
  const [offlineSttLoadPercent, setOfflineSttLoadPercent] = useState<number | null>(
    null,
  )
  const finishRecordingRef = useRef<() => void>(() => {})
  const mountedRef = useRef(true)
  const processingRef = useRef(false)
  const finishingRef = useRef(false)
  const everHeardRef = useRef(false)
  const lastTranscriptRef = useRef('')
  const pendingInterimRef = useRef('')
  const interimRafRef = useRef<number | null>(null)
  const finishFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voiceTurnGenRef = useRef(0)
  const listenIntentRef = useRef(0)
  const noSpeechFallbackDeliveredRef = useRef(false)
  const resultDeliveredRef = useRef(false)
  const lastLevelStoreAtRef = useRef(0)

  const resetTurnFlags = useCallback(() => {
    processingRef.current = false
    finishingRef.current = false
  }, [])

  const syncPresenceAfterTurn = useCallback(() => {
    if (!mountedRef.current) return
    syncIdleAfterVoiceTurn()
  }, [])

  const recognitionLang = resolveSpeechRecognitionLang(speechInputLang)

  useOfflineSttPreload(
    onListenPage,
    recognitionLang,
    setOfflineSttReady,
    setOfflineSttLoadPercent,
    resetTurnFlags,
  )

  const pushMicLevel = useCallback(
    (level: number) => {
      if (level > MIC_LEVEL_HEARD_THRESHOLD) everHeardRef.current = true
      setOrbAudioLevel(level)
      const now = performance.now()
      if (now - lastLevelStoreAtRef.current < getVoicePlatformTuning().uiAudioLevelThrottleMs) {
        return
      }
      lastLevelStoreAtRef.current = now
      setAudioLevel(level)
    },
    [setAudioLevel],
  )

  const clearFinishWaitTimer = useCallback(() => {
    if (finishFallbackTimer.current) {
      clearTimeout(finishFallbackTimer.current)
      finishFallbackTimer.current = null
    }
  }, [])

  const resolveHeardText = useCallback(() => {
    const merged = mergeHeardTranscript({
      lastRef: lastTranscriptRef.current,
      pendingInterim: pendingInterimRef.current,
      captured: getCapturedTranscript(),
    })
    return isUiTranscriptPlaceholder(merged) ? '' : merged
  }, [])

  const captureSnapshot = useCallback((): import('@/features/voice/logic/voiceDebug').VoiceCaptureSnapshot => {
    return {
      lastRef: lastTranscriptRef.current,
      pendingInterim: pendingInterimRef.current,
      liveTranscript: useUiStore.getState().liveTranscript,
      captured: getCapturedTranscript(),
      resolved: resolveHeardText(),
      everHeard: everHeardRef.current,
      processing: processingRef.current,
      sessionActive: isListenSessionActive(),
    }
  }, [resolveHeardText])

  useEffect(() => {
    installVoiceDebugConsole(() => ({
      ui: captureSnapshot(),
      turnPhase: deriveVoiceTurnPhase(),
      speechState: useUiStore.getState().speechState,
      orbState: useUiStore.getState().orbState,
      speechInputLang,
      recognitionLang,
      stt: getSttDebugState(),
      voiceTurn: summarizeLastVoiceTurn(),
    }))
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (finishFallbackTimer.current) clearTimeout(finishFallbackTimer.current)
      if (interimRafRef.current) cancelAnimationFrame(interimRafRef.current)
    }
  }, [captureSnapshot, recognitionLang, speechInputLang])

  const waitForData = useCallback(async () => {
    if (dataReady) return
    for (let i = 0; i < 120; i++) {
      if (useUiStore.getState().dataReady) return
      await new Promise((r) => setTimeout(r, 50))
    }
  }, [dataReady])

  const deliverNoSpeechFallback = useCallback(() => {
    if (noSpeechFallbackDeliveredRef.current) return
    noSpeechFallbackDeliveredRef.current = true
    voiceDebugWarn('ui:no-speech-fallback', captureSnapshot())
    const { audioStart, soundStart } = getListenSignals()
    const noVoiceHeard = audioStart && !soundStart
    const offlineErr = getLastOfflineSttError()
    const modelFailed = getSttEngine() === 'local' && offlineErr
    deliverNozomi(
      modelFailed
        ? {
            jp: '音声モデルの読み込みに失敗しました。インターネット接続を確認して、もう一度試してください。',
            romaji: 'Onsei moderu no yomikomi ni shippai shimashita.',
            en: 'Could not load the speech model. Check your internet connection and try again.',
          }
        : noVoiceHeard
          ? {
              jp: 'マイクは開いていますが、声が届いていないようです。入力デバイスと音量を確認して、もう一度話してみて。',
              romaji: 'Maiku wa hiraite imasu ga, koe ga todoite inai you desu.',
              en: 'The mic is open but no voice was detected. Check your input device and volume, then try again.',
            }
          : {
              jp: 'うまく聞こえなかったみたい。もう一度、ゆっくり話してみて。',
              romaji: 'Umaku kikoenakatta mitai. Mou ichido, yukkuri hanashite mite.',
              en: "I didn't catch that. Please try again a little more slowly.",
            },
      'daily',
      undefined,
      'voice',
    )
    finishingRef.current = false
    syncPresenceAfterTurn()
    setAudioLevel(0)
  }, [captureSnapshot, deliverNozomi, setAudioLevel, syncPresenceAfterTurn])

  const handleFinalTranscript = useCallback(
    async (text: string) => {
      if (processingRef.current || resultDeliveredRef.current || !mountedRef.current) {
        voiceDebug('ui:final-skipped', {
          reason: processingRef.current
            ? 'already-processing'
            : resultDeliveredRef.current
              ? 'already-delivered'
              : 'unmounted',
          incoming: text.slice(0, 80),
        })
        return
      }
      if (finishFallbackTimer.current) {
        clearTimeout(finishFallbackTimer.current)
        finishFallbackTimer.current = null
      }

      const trimmed = (text.trim() || resolveHeardText()).trim()
      if (isUiTranscriptPlaceholder(trimmed)) {
        voiceDebugWarn('ui:final-placeholder-skipped', { text: trimmed.slice(0, 80) })
        finishingRef.current = false
        forceRecoverVoiceUi('placeholder-transcript')
        return
      }
      markVoiceSpan('stt_done', { length: trimmed.length })
      if (!trimmed) {
        voiceDebugWarn('ui:final-empty', captureSnapshot())
        processingRef.current = false
        finishingRef.current = false
        setTranscriptFinalizing(false)
        endListenSessionAfterTurn()
        deliverNoSpeechFallback()
        return
      }
      resultDeliveredRef.current = true

      processingRef.current = true
      voiceDebug('ui:final-start', { incoming: trimmed.slice(0, 160), ...captureSnapshot() })
      markListenTurnHandled()
      setLiveTranscript(trimmed)
      enterVoiceGenerating()

      const turnId = ++voiceTurnGenRef.current
      const shouldAbort = () => voiceTurnGenRef.current !== turnId
      const pinned = useNozomiStore.getState().voicePinnedSuggestion?.jp

      try {
        await waitForData()
        if (isMobileDevice()) {
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          })
        }
        await Promise.race([
          sendUserMessage(trimmed, 'voice', {
            shouldAbort,
            suggestionHint: pinned,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('voice-turn-timeout')), VOICE_TURN_TIMEOUT_MS),
          ),
        ])
        if (shouldAbort()) return
        voiceDebug('ui:final-ok', { length: trimmed.length })
      } catch (err) {
        voiceTurnGenRef.current++
        if (shouldAbort()) return
        voiceDebugError('ui:final-failed', {
          error: err instanceof Error ? err.message : String(err),
          text: trimmed.slice(0, 160),
        })
        deliverNozomi(
          {
            jp: 'ごめん、今うまく処理できなかった。もう一回話してみて。',
            romaji: 'Gomen, ima umaku shori dekinakatta. Mou ikkai hanashite mite.',
            en: "Sorry, I couldn't process that just now. Please try once more.",
          },
          'daily',
          undefined,
          'voice',
        )
      } finally {
        const keepMic =
          shouldKeepMicWarmOnListenPage(useNozomiStore.getState().settings) &&
          window.location.pathname === '/listen'
        endListenSessionAfterTurn({ keepMic })
        everHeardRef.current = false
        processingRef.current = false
        finishingRef.current = false
        lastLevelStoreAtRef.current = 0
        setAudioLevel(0)
        resetOrbAudioLevel()
        syncPresenceAfterTurn()
        voiceDebug('ui:turn-metrics', { summary: summarizeLastVoiceTurn() })
      }
    },
    [
      captureSnapshot,
      deliverNoSpeechFallback,
      deliverNozomi,
      resolveHeardText,
      sendUserMessage,
      setLiveTranscript,
      setOrbState,
      setSpeechState,
      setTranscriptFinalizing,
      syncPresenceAfterTurn,
      waitForData,
    ],
  )

  const handleFinalizeFailed = useCallback(
    (err: SpeechError) => {
      if (!mountedRef.current) return
      voiceDebugError('ui:finalize-failed', { code: err.code, message: err.message })
      clearFinishWaitTimer()
      processingRef.current = false
      finishingRef.current = false
      resultDeliveredRef.current = true
      clearTranscriptFinalizing()
      setErrorCode(err.code)
      enterVoiceError()
      setAudioLevel(0)
      resetOrbAudioLevel()
      markListenTurnHandled()
      endListenSessionAfterTurn()
    },
    [clearFinishWaitTimer, setAudioLevel],
  )

  useEffect(() => {
    if (speechState !== 'permission_pending') return
    const timer = window.setTimeout(() => {
      if (!mountedRef.current) return
      const ui = useUiStore.getState()
      if (ui.speechState !== 'permission_pending') return
      if (isListenSessionActive()) return
      voiceDebugWarn('ui:permission-prepare-timeout', captureSnapshot())
      finishingRef.current = false
      forceRecoverVoiceUi('permission-prepare-timeout')
      setErrorCode('busy')
      enterVoiceError()
    }, PERMISSION_PREPARE_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [speechState, captureSnapshot])

  const handleError = useCallback(
    (err: SpeechError) => {
      if (!mountedRef.current) return
      voiceDebugError('ui:stt-error', { code: err.code, message: err.message })
      clearFinishWaitTimer()
      processingRef.current = false
      finishingRef.current = false
      cancelListening()
      releaseSharedMicrophone()
      enterVoiceError()
      setErrorCode(err.code)
      setAudioLevel(0)
      resetOrbAudioLevel()
    },
    [clearFinishWaitTimer, setAudioLevel],
  )

  const handleStateChange = useCallback(
    (state: SpeechState) => {
      if (!mountedRef.current) return
      if (state === 'idle') {
        if (processingRef.current) {
          voiceDebug('ui:speech-state-ignored', { state, reason: 'turn-processing' })
          return
        }
        if (finishingRef.current) {
          const session = getListenSession()
          if (session && isListenSessionActive()) {
            voiceDebug('ui:speech-state-ignored', { state, reason: 'finalize-active' })
            return
          }
          finishingRef.current = false
          clearTranscriptFinalizing()
        }
      }
      if (
        state === 'listening' &&
        (processingRef.current || finishingRef.current)
      ) {
        voiceDebug('ui:speech-state-ignored', { state, reason: 'finalize-active' })
        return
      }
      voiceDebug('ui:speech-state', { state })
      if (state === 'permission_pending') enterVoiceListenPrepare()
      if (state === 'listening') {
        setErrorCode(undefined)
        enterVoiceCapturing()
      }
      if (state === 'processing') {
        const step = useUiStore.getState().voicePipelineStep
        if (step === 'generating') enterVoiceGenerating()
        else if (step === 'understanding') enterVoiceUnderstanding()
        else enterVoiceFinalizing()
      }
    },
    [setSpeechState],
  )

  const buildCallbacks = useCallback(
    () => ({
      onStateChange: handleStateChange,
      onInterim: (text: string) => {
        if (text.trim()) everHeardRef.current = true
        lastTranscriptRef.current = text
        pendingInterimRef.current = text
        if (processingRef.current) return
        if (interimRafRef.current) return
        interimRafRef.current = requestAnimationFrame(() => {
          interimRafRef.current = null
          if (!mountedRef.current || processingRef.current || finishingRef.current) {
            return
          }
          setLiveTranscript(pendingInterimRef.current)
        })
      },
      onResult: (text: string) => {
        const trimmed = text.trim()
        if (resultDeliveredRef.current) {
          voiceDebug('ui:onResult-skipped', { reason: 'already-delivered' })
          return
        }
        if (!trimmed) {
          if (finishingRef.current || useUiStore.getState().transcriptFinalizing) {
            voiceDebug('ui:onResult-empty', captureSnapshot())
            void handleFinalTranscript('')
            return
          }
          voiceDebug('ui:onResult-skipped', { reason: 'empty-not-finishing' })
          return
        }
        if (isUiTranscriptPlaceholder(trimmed)) {
          voiceDebugWarn('ui:onResult-placeholder-skipped', { text: trimmed })
          return
        }
        voiceDebug('ui:onResult', { length: text.length, text: text.slice(0, 160) })
        void handleFinalTranscript(text)
      },
      onError: handleError,
      onFinalizeFailed: handleFinalizeFailed,
      onLevel: pushMicLevel,
    }),
    [
      captureSnapshot,
      handleError,
      handleFinalizeFailed,
      handleFinalTranscript,
      handleStateChange,
      pushMicLevel,
      setLiveTranscript,
    ],
  )

  const listenOptions = useMemo(() => ({ lang: recognitionLang }), [recognitionLang])

  const handleBargeIn = useCallback(() => {
    voiceTurnGenRef.current += 1
    const intent = ++listenIntentRef.current
    invalidateContinuousListen()
    stopSpeaking()
    stopBargeInMonitor()
    clearFinishWaitTimer()
    processingRef.current = false
    finishingRef.current = false
    noSpeechFallbackDeliveredRef.current = false
    resultDeliveredRef.current = false
    silenceEndpointRef.current?.stop()
    if (isListenSessionActive()) {
      finalizeListening()
    }
    setLiveTranscript('')
    everHeardRef.current = false
    lastTranscriptRef.current = ''
    pendingInterimRef.current = ''
    setErrorCode(undefined)
    enterVoiceInterrupted()
    markListenArmedFromGesture()
    if (needsGestureLockedMic()) startMicCaptureFromGesture()
    voiceDebug('ui:barge-in-listen')
    void (async () => {
      await afterSpeechOutputForListen()
      if (!mountedRef.current || intent !== listenIntentRef.current) return
      if (processingRef.current || finishingRef.current) return
      beginVoiceTurnMetrics()
      clearStaleListenSession()
      startListening(buildCallbacks(), listenOptions)
    })()
  }, [
    buildCallbacks,
    clearFinishWaitTimer,
    clearStaleListenSession,
    listenOptions,
    setLiveTranscript,
    setOrbState,
    setSpeechState,
  ])

  const beginListening = useCallback(() => {
    if (!speechSupported().stt) {
      setOrbState('idle')
      setSpeechState('error')
      setErrorCode('not-supported')
      return false
    }
    if (
      processingRef.current ||
      finishingRef.current ||
      finishFallbackTimer.current
    ) {
      voiceDebugWarn('ui:begin-blocked', {
        reason: processingRef.current
          ? 'turn-processing'
          : finishingRef.current
            ? 'finishing'
            : 'finish-wait',
      })
      return false
    }
    const uiGate = useUiStore.getState()
    if (uiGate.speechState === 'processing') {
      if (processingRef.current || finishingRef.current) {
        voiceDebugWarn('ui:begin-blocked', { reason: 'speech-processing' })
        return false
      }
      forceRecoverVoiceUi('orphan-processing-ui')
    }
    if (useUiStore.getState().transcriptFinalizing) {
      if (finishingRef.current) {
        voiceDebugWarn('ui:begin-blocked', { reason: 'transcript-finalizing' })
        return false
      }
      forceRecoverVoiceUi('orphan-transcript-finalizing')
    }
    const speech = useUiStore.getState().speechState
    if (
      isListenSessionActive() &&
      (speech === 'listening' || speech === 'permission_pending')
    ) {
      voiceDebug('ui:begin-reattach', { lang: recognitionLang })
      setErrorCode(undefined)
      attachListeningCallbacks(buildCallbacks())
      if (speech === 'listening') enterVoiceCapturing()
      return true
    }
    if (isAnyTtsOutputActive()) stopSpeaking()

    clearFinishWaitTimer()
    clearStaleListenSession()
    if (useUiStore.getState().transcriptFinalizing) {
      clearTranscriptFinalizing()
    }
    const uiBeforeStart = useUiStore.getState()
    if (
      !isListenSessionActive() &&
      (uiBeforeStart.speechState === 'listening' ||
        uiBeforeStart.speechState === 'permission_pending')
    ) {
      forceRecoverVoiceUi('orphan-listen-ui')
    }
    noSpeechFallbackDeliveredRef.current = false
    resultDeliveredRef.current = false
    setErrorCode(undefined)
    finishingRef.current = false
    setLiveTranscript('')
    everHeardRef.current = false
    lastTranscriptRef.current = ''
    pendingInterimRef.current = ''
    stopSpeaking()
    if (
      needsGestureLockedMic() &&
      !getSharedMicStream()?.active &&
      !hasActiveGestureMic()
    ) {
      startMicCaptureFromGesture()
    }
    enterVoiceListenPrepare()
    markListenArmedFromGesture()
    voiceDebug('ui:beginListening', { lang: recognitionLang })

    const intent = ++listenIntentRef.current
    invalidateContinuousListen()
    const engine = resolveSttEngineForLang(getSttEngine(), recognitionLang)
    if (engine === 'local') {
      cancelScheduledReleaseOfflineStt()
      touchOfflineSttPipeline()
    }
    void (async () => {
      await afterSpeechOutputForListen()
      if (!mountedRef.current || intent !== listenIntentRef.current) return
      const state = useUiStore.getState().speechState
      if (state !== 'permission_pending' && state !== 'listening') return
      if (processingRef.current || finishingRef.current) return
      beginVoiceTurnMetrics()
      clearStaleListenSession()
      if (isListenSessionActive()) {
        attachListeningCallbacks(buildCallbacks())
        return
      }
      startListening(buildCallbacks(), listenOptions)
    })()
    return true
  }, [
    recognitionLang,
    buildCallbacks,
    listenOptions,
    clearFinishWaitTimer,
    setLiveTranscript,
    setOrbState,
    setSpeechState,
  ])

  const armAndGoToListen = useCallback(async () => {
    const support = speechSupported()
    if (!support.stt) {
      setErrorCode('not-supported')
      return
    }
    if (support.needsHttps || micNeedsSecureContext()) {
      setErrorCode('not-allowed')
      navigate('/listen')
      return
    }

    setErrorCode(undefined)
    setLiveTranscript('')
    everHeardRef.current = false
    lastTranscriptRef.current = ''
    stopSpeaking()
    setOrbState('idle')
    startMicCaptureFromGesture()
    markListenArmedFromGesture()
    voiceDebug('ui:armAndGoToListen', { lang: recognitionLang })

    if (getSttEngine() === 'browser' || needsGestureLockedMic() || isMobileDevice()) {
      if (!getSharedMicStream()?.active && !hasActiveGestureMic()) {
        const granted = await primeMicrophonePermission()
        if (!granted) {
          setErrorCode('not-allowed')
          setSpeechState('error')
          navigate('/listen')
          return
        }
      } else {
        markMicPrimed()
      }
    }

    navigate('/listen', { state: { sessionArmed: true } })
  }, [navigate, recognitionLang, setLiveTranscript, setOrbState, setSpeechState])

  const attachToActiveSession = useCallback(() => {
    if (!isListenSessionActive()) return false
    voiceDebug('ui:attach-session')
    setErrorCode(undefined)
    attachListeningCallbacks(buildCallbacks())
    if (useUiStore.getState().speechState === 'listening') {
      setOrbState('listening')
    }
    return true
  }, [buildCallbacks, setOrbState])

  const detachUi = useCallback(() => {
    setAudioLevel(0)
    resetOrbAudioLevel()
  }, [setAudioLevel])

  const cancelSession = useCallback(() => {
    voiceDebug('ui:cancel', captureSnapshot())
    stopBargeInMonitor()
    silenceEndpointRef.current?.stop()
    invalidateContinuousListen()
    clearFinishWaitTimer()
    voiceTurnGenRef.current++
    listenIntentRef.current++
    noSpeechFallbackDeliveredRef.current = false
    resultDeliveredRef.current = false
    processingRef.current = false
    finishingRef.current = false
    everHeardRef.current = false
    cancelListening()
    releaseSharedMicrophone()
    releaseGestureMicStream()
    setAudioLevel(0)
    resetOrbAudioLevel()
    setLiveTranscript('')
    setErrorCode(undefined)
    forceRecoverVoiceUi('cancel-session')
  }, [
    captureSnapshot,
    clearFinishWaitTimer,
    setAudioLevel,
    setLiveTranscript,
    setOrbState,
    setSpeechState,
  ])

  const silenceEndpointRef = useVoiceSilenceEndpoint(
    appSettings,
    speechState,
    () => finishRecordingRef.current(),
    processingRef,
    finishingRef,
  )

  const finishRecording = useVoiceFinishRecording({
    mountedRef,
    processingRef,
    finishingRef,
    resultDeliveredRef,
    everHeardRef,
    pendingInterimRef,
    lastTranscriptRef,
    interimRafRef,
    finishFallbackTimer,
    captureSnapshot,
    clearFinishWaitTimer,
    stopSilenceEndpoint: () => silenceEndpointRef.current?.stop(),
    deliverNoSpeechFallback,
    handleFinalTranscript,
    resolveHeardText,
  })
  finishRecordingRef.current = finishRecording

  const clearError = useCallback(() => {
    setErrorCode(undefined)
    forceRecoverVoiceUi('clear-error')
  }, [])

  const transcriptFinalizing = useUiStore((s) => s.transcriptFinalizing)

  useVoicePipelineStuckRecovery(
    transcriptFinalizing,
    speechState,
    mountedRef,
    processingRef,
    finishingRef,
    captureSnapshot,
    clearFinishWaitTimer,
    cancelSession,
    deliverNozomi,
    syncPresenceAfterTurn,
  )

  useEffect(() => {
    if (orbState !== 'speaking' && !isAnyTtsOutputActive()) {
      stopBargeInMonitor()
      return
    }
    startBargeInMonitor({
      isActive: () =>
        isAnyTtsOutputActive() || useUiStore.getState().orbState === 'speaking',
      onBargeIn: handleBargeIn,
    })
    return () => stopBargeInMonitor()
  }, [orbState, handleBargeIn])

  useVoiceContinuousListen(beginListening, mountedRef, processingRef, finishingRef)

  useEffect(() => {
    if (!labsWakeWord) {
      stopWakeWordMonitor()
      return
    }
    startWakeWordMonitor({
      keyword: 'Nozomi',
      onWake: () => {
        void armAndGoToListen()
      },
    })
    return () => stopWakeWordMonitor()
  }, [labsWakeWord, armAndGoToListen])

  return useMemo(
    () => ({
      armAndGoToListen,
      beginListening,
      finishRecording,
      cancelSession,
      attachToActiveSession,
      detachUi,
      errorCode,
      clearError,
      offlineSttReady,
      offlineSttLoadPercent,
    }),
    [
      armAndGoToListen,
      beginListening,
      finishRecording,
      cancelSession,
      attachToActiveSession,
      detachUi,
      errorCode,
      clearError,
      offlineSttReady,
      offlineSttLoadPercent,
    ],
  )
}
