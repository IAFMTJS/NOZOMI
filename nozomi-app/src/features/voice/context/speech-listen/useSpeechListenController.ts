import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FINISH_WAIT_DEFAULT_MS,
  FINISH_WAIT_HEARD_MS,
  FINISH_WAIT_LOCAL_MS,
  MIC_LEVEL_HEARD_THRESHOLD,
  UI_AUDIO_LEVEL_THROTTLE_MS,
  VOICE_TURN_TIMEOUT_MS,
} from '@/contexts/speech-listen/constants'
import type { SpeechListenApi } from '@/contexts/speech-listen/types'
import { UI_LABELS } from '@/data/ui-labels'
import { useConversation } from '@/features/conversation'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'
import { resetOrbAudioLevel, setOrbAudioLevel } from '@/systems/orb/orbAudioLevel'
import {
  getLastOfflineSttError,
  isOfflineSttReady,
  preloadOfflineStt,
  releaseOfflineSttPipeline,
  whenOfflineSttReady,
} from '@/systems/speech/offlineStt'
import { resolveSpeechRecognitionLang } from '@/systems/speech/speechLocale'
import {
  attachListeningCallbacks,
  cancelListening,
  endListenSessionAfterTurn,
  finalizeListening,
  getActiveSttEngine,
  getCapturedTranscript,
  getListenSession,
  getListenSignals,
  getSttDebugState,
  isListenSessionActive,
  markListenArmedFromGesture,
  markListenTurnHandled,
  micNeedsSecureContext,
  primeMicrophonePermission,
  releaseGestureMicStream,
  releaseSharedMicrophone,
  speechSupported,
  startListening,
  startMicCaptureFromGesture,
  stopSpeaking,
  syncCaptureFromDisplay,
  whenSttWorkIdle,
  type SpeechError,
  type SpeechErrorCode,
} from '@/systems/speech/speechService'
import { needsGestureLockedMic } from '@/utils/device'
import { warmJapaneseVoices } from '@/systems/speech/japaneseVoicePicker'
import { clearTranscriptFinalizing } from '@/features/voice/logic/speechPresenceSync'
import { getSttEngine, resolveSttEngineForLang } from '@/systems/speech/sttEngine'
import {
  installVoiceDebugConsole,
  voiceDebug,
  voiceDebugCapture,
  voiceDebugError,
  voiceDebugWarn,
} from '@/systems/speech/voiceDebug'
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
import { createSilenceEndpointing } from '@/features/voice/logic/silenceEndpointing'
import {
  isContinuousListenMode,
  shouldAutoStopListening,
  shouldKeepMicWarmOnListenPage,
} from '@/features/voice/logic/voiceSettings'
import { afterSpeechOutputForListen } from '@/features/voice/logic/startListenPipeline'
import { isAnyTtsOutputActive } from '@/features/voice/logic/ttsOutputState'
import {
  bumpContinuousGeneration,
  invalidateContinuousListen,
  isContinuousGenerationCurrent,
} from '@/features/voice/logic/voiceTurnBridge'
import {
  setOnSpeechOutputEnded,
} from '@/features/voice/logic/voiceSessionContinuity'
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
  const silenceEndpointRef = useRef<ReturnType<typeof createSilenceEndpointing> | null>(
    null,
  )
  const [offlineSttReady, setOfflineSttReady] = useState(false)
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
  const lastLevelStoreAtRef = useRef(0)
  const prevRecognitionLangRef = useRef<string | null>(null)

  const syncPresenceAfterTurn = useCallback(() => {
    if (!mountedRef.current) return
    const orb = useUiStore.getState().orbState
    setSpeechState('idle')
    setLiveTranscript('')
    clearTranscriptFinalizing()
    if (!isAnyTtsOutputActive() && orb !== 'speaking') {
      setOrbState('idle')
    }
  }, [setLiveTranscript, setOrbState, setSpeechState])

  const recognitionLang = resolveSpeechRecognitionLang(speechInputLang)

  const pushMicLevel = useCallback(
    (level: number) => {
      if (level > MIC_LEVEL_HEARD_THRESHOLD) everHeardRef.current = true
      setOrbAudioLevel(level)
      const now = performance.now()
      if (now - lastLevelStoreAtRef.current < UI_AUDIO_LEVEL_THROTTLE_MS) return
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
    return (
      lastTranscriptRef.current.trim() ||
      pendingInterimRef.current.trim() ||
      useUiStore.getState().liveTranscript.trim() ||
      getCapturedTranscript()
    ).trim()
  }, [])

  const captureSnapshot = useCallback((): import('@/systems/speech/voiceDebug').VoiceCaptureSnapshot => {
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
    const prevLang = prevRecognitionLangRef.current
    prevRecognitionLangRef.current = recognitionLang
    const langChanged = prevLang !== null && prevLang !== recognitionLang
    if (langChanged && isListenSessionActive()) {
      voiceDebug('ui:lang-change-cancel', { lang: recognitionLang, prevLang })
      cancelListening()
      releaseSharedMicrophone()
      processingRef.current = false
      finishingRef.current = false
      setSpeechState('idle')
      setOrbState('idle')
      setLiveTranscript('')
    }
    const engine = resolveSttEngineForLang(getSttEngine(), recognitionLang)
    if (engine !== 'local') {
      setOfflineSttReady(true)
      return
    }
    if (!onListenPage) {
      setOfflineSttReady(false)
      return
    }
    setOfflineSttReady(isOfflineSttReady(recognitionLang))
    preloadOfflineStt(recognitionLang, { force: true })
    const readyPoll = window.setInterval(() => {
      if (!mountedRef.current) return
      if (isOfflineSttReady(recognitionLang)) setOfflineSttReady(true)
    }, 400)
    void whenOfflineSttReady(recognitionLang)
      .then(() => {
        if (!mountedRef.current) return
        if (
          resolveSpeechRecognitionLang(useNozomiStore.getState().settings.speechInputLang) !==
          recognitionLang
        ) {
          return
        }
        setOfflineSttReady(true)
      })
      .catch((err) => {
        voiceDebugWarn('ui:offline-preload-failed', {
          error: err instanceof Error ? err.message : String(err),
        })
      })
      .finally(() => window.clearInterval(readyPoll))
    if ('speechSynthesis' in window) {
      const warmVoices = () => warmJapaneseVoices()
      warmVoices()
      window.speechSynthesis.addEventListener('voiceschanged', warmVoices)
      return () => {
        window.clearInterval(readyPoll)
        window.speechSynthesis.removeEventListener('voiceschanged', warmVoices)
      }
    }
    return () => window.clearInterval(readyPoll)
  }, [onListenPage, recognitionLang, setLiveTranscript, setOrbState, setSpeechState])

  useEffect(() => {
    installVoiceDebugConsole(() => ({
      ui: captureSnapshot(),
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
      if (processingRef.current || !mountedRef.current) {
        voiceDebug('ui:final-skipped', {
          reason: processingRef.current ? 'already-processing' : 'unmounted',
          incoming: text.slice(0, 80),
        })
        return
      }
      if (finishFallbackTimer.current) {
        clearTimeout(finishFallbackTimer.current)
        finishFallbackTimer.current = null
      }

      const trimmed = (text.trim() || resolveHeardText()).trim()
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

      setTranscriptFinalizing(false)
      processingRef.current = true
      if (getActiveSttEngine() === 'local') {
        releaseOfflineSttPipeline()
      }
      voiceDebug('ui:final-start', { incoming: trimmed.slice(0, 160), ...captureSnapshot() })
      markListenTurnHandled()
      setLiveTranscript(trimmed)
      setSpeechState('processing')
      setOrbState('thinking')

      const turnId = ++voiceTurnGenRef.current
      const shouldAbort = () => voiceTurnGenRef.current !== turnId
      const pinned = useNozomiStore.getState().voicePinnedSuggestion?.jp

      try {
        await waitForData()
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

  const handleError = useCallback(
    (err: SpeechError) => {
      if (!mountedRef.current) return
      voiceDebugError('ui:stt-error', { code: err.code, message: err.message })
      clearFinishWaitTimer()
      processingRef.current = false
      finishingRef.current = false
      cancelListening()
      releaseSharedMicrophone()
      setOrbState('idle')
      setSpeechState('error')
      setErrorCode(err.code)
      setAudioLevel(0)
      resetOrbAudioLevel()
      clearTranscriptFinalizing()
    },
    [clearFinishWaitTimer, setAudioLevel, setOrbState, setSpeechState],
  )

  const handleStateChange = useCallback(
    (state: SpeechState) => {
      if (!mountedRef.current) return
      if (state === 'idle' && (processingRef.current || finishingRef.current)) {
        voiceDebug('ui:speech-state-ignored', { state, reason: 'turn-active' })
        return
      }
      if (
        state === 'listening' &&
        (processingRef.current || finishingRef.current)
      ) {
        voiceDebug('ui:speech-state-ignored', { state, reason: 'finalize-active' })
        return
      }
      voiceDebug('ui:speech-state', { state })
      setSpeechState(state)
      if (state === 'permission_pending') setOrbState('listening')
      if (state === 'listening') {
        setErrorCode(undefined)
        setOrbState('listening')
      }
      if (state === 'processing') setOrbState('thinking')
    },
    [setOrbState, setSpeechState],
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
        if (processingRef.current && trimmed) {
          voiceDebug('ui:onResult-skipped', { reason: 'already-processing' })
          return
        }
        if (!trimmed && !finishingRef.current) {
          voiceDebug('ui:onResult-skipped', { reason: 'empty-not-finishing' })
          return
        }
        voiceDebug('ui:onResult', { length: text.length, text: text.slice(0, 160) })
        void handleFinalTranscript(text)
      },
      onError: handleError,
      onLevel: pushMicLevel,
    }),
    [handleError, handleFinalTranscript, handleStateChange, pushMicLevel, setLiveTranscript],
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
    silenceEndpointRef.current?.stop()
    if (isListenSessionActive()) {
      finalizeListening()
    }
    setLiveTranscript('')
    everHeardRef.current = false
    lastTranscriptRef.current = ''
    pendingInterimRef.current = ''
    setErrorCode(undefined)
    setSpeechState('permission_pending')
    setOrbState('listening')
    markListenArmedFromGesture()
    if (needsGestureLockedMic()) startMicCaptureFromGesture()
    voiceDebug('ui:barge-in-listen')
    void (async () => {
      await afterSpeechOutputForListen()
      if (!mountedRef.current || intent !== listenIntentRef.current) return
      if (processingRef.current || finishingRef.current) return
      beginVoiceTurnMetrics()
      startListening(buildCallbacks(), listenOptions)
    })()
  }, [
    buildCallbacks,
    clearFinishWaitTimer,
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
    if (useUiStore.getState().speechState === 'processing') {
      voiceDebugWarn('ui:begin-blocked', { reason: 'speech-processing' })
      return false
    }
    if (isAnyTtsOutputActive()) stopSpeaking()

    clearFinishWaitTimer()
    noSpeechFallbackDeliveredRef.current = false
    setErrorCode(undefined)
    finishingRef.current = false
    setLiveTranscript('')
    everHeardRef.current = false
    lastTranscriptRef.current = ''
    pendingInterimRef.current = ''
    stopSpeaking()
    beginVoiceTurnMetrics()
    if (needsGestureLockedMic()) startMicCaptureFromGesture()
    setSpeechState('permission_pending')
    setOrbState('listening')
    markListenArmedFromGesture()
    voiceDebug('ui:beginListening', { lang: recognitionLang })

    const intent = ++listenIntentRef.current
    invalidateContinuousListen()
    const engine = resolveSttEngineForLang(getSttEngine(), recognitionLang)
    if (engine === 'local') {
      startListening(buildCallbacks(), listenOptions)
    }
    void (async () => {
      await afterSpeechOutputForListen()
      if (!mountedRef.current || intent !== listenIntentRef.current) return
      const state = useUiStore.getState().speechState
      if (state !== 'permission_pending' && state !== 'listening') return
      if (processingRef.current || finishingRef.current) return
      if (engine !== 'local') {
        startListening(buildCallbacks(), listenOptions)
        return
      }
      if (!getListenSession()) {
        voiceDebugWarn('ui:listen-retry-local')
        startListening(buildCallbacks(), listenOptions)
      }
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

    if (getSttEngine() === 'browser' || needsGestureLockedMic()) {
      const granted = await primeMicrophonePermission()
      if (!granted) {
        setErrorCode('not-allowed')
        setSpeechState('error')
        navigate('/listen')
        return
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
    processingRef.current = false
    finishingRef.current = false
    everHeardRef.current = false
    cancelListening()
    releaseSharedMicrophone()
    releaseGestureMicStream()
    setAudioLevel(0)
    resetOrbAudioLevel()
    setLiveTranscript('')
    setOrbState('idle')
    setSpeechState('idle')
    setErrorCode(undefined)
    clearTranscriptFinalizing()
  }, [
    captureSnapshot,
    clearFinishWaitTimer,
    setAudioLevel,
    setLiveTranscript,
    setOrbState,
    setSpeechState,
  ])

  const finishRecording = useCallback(() => {
    if (processingRef.current || finishingRef.current) {
      voiceDebug('ui:finish-skipped', {
        reason: processingRef.current ? 'processing' : 'finishing',
      })
      return
    }
    finishingRef.current = true
    markVoiceSpan('listen_finish')
    setTranscriptFinalizing(true)
    voiceDebugCapture('ui:finish', captureSnapshot())
    silenceEndpointRef.current?.stop()
    clearFinishWaitTimer()
    setSpeechState('processing')
    setOrbState('thinking')

    if (interimRafRef.current) {
      cancelAnimationFrame(interimRafRef.current)
      interimRafRef.current = null
    }
    if (pendingInterimRef.current.trim()) {
      lastTranscriptRef.current = pendingInterimRef.current
      setLiveTranscript(pendingInterimRef.current)
    } else if (getActiveSttEngine() === 'local') {
      setLiveTranscript(UI_LABELS.statusFinalizing.jp)
    }

    const heardNow = resolveHeardText()
    if (heardNow) syncCaptureFromDisplay(heardNow)

    const session = getListenSession()
    if (session && !session.gotResult) {
      finalizeListening()
    } else {
      voiceDebugWarn('ui:finish-no-session', captureSnapshot())
      finishingRef.current = false
      setTranscriptFinalizing(false)
      setSpeechState('idle')
      setOrbState('idle')
      return
    }

    const started = Date.now()
    const engine = getActiveSttEngine() ?? getSttEngine()
    const maxWait =
      engine === 'local'
        ? FINISH_WAIT_LOCAL_MS
        : everHeardRef.current
          ? FINISH_WAIT_HEARD_MS
          : FINISH_WAIT_DEFAULT_MS
    const safetyCap = maxWait
    voiceDebug('ui:finish-wait', { maxWaitMs: maxWait, everHeard: everHeardRef.current })

    const waitForTranscript = () => {
      if (processingRef.current) return
      if (useUiStore.getState().speechState === 'error') {
        finishingRef.current = false
        return
      }
      const heard = resolveHeardText()
      if (heard) {
        voiceDebug('ui:finish-wait-hit', {
          waitedMs: Date.now() - started,
          length: heard.length,
        })
        syncCaptureFromDisplay(heard)
        void handleFinalTranscript(heard)
        return
      }
      if (engine === 'local' && Date.now() - started < safetyCap) {
        void whenSttWorkIdle().then(() => {
          if (!mountedRef.current || processingRef.current) return
          const afterIdle = resolveHeardText()
          if (afterIdle) {
            syncCaptureFromDisplay(afterIdle)
            void handleFinalTranscript(afterIdle)
            return
          }
          finishFallbackTimer.current = setTimeout(waitForTranscript, 100)
        })
        return
      }
      if (Date.now() - started < maxWait && Date.now() - started < safetyCap) {
        finishFallbackTimer.current = setTimeout(waitForTranscript, 100)
        return
      }
      if (!processingRef.current) {
        voiceDebugWarn('ui:finish-wait-timeout', {
          waitedMs: Date.now() - started,
          maxWait,
          ...captureSnapshot(),
        })
        void whenSttWorkIdle(engine === 'local' ? FINISH_WAIT_LOCAL_MS : 8_000).then(() => {
          if (!mountedRef.current || processingRef.current) return
          const late = resolveHeardText()
          if (late) {
            syncCaptureFromDisplay(late)
            void handleFinalTranscript(late)
            return
          }
          finishingRef.current = false
          setTranscriptFinalizing(false)
          endListenSessionAfterTurn()
          deliverNoSpeechFallback()
        })
      }
    }
    finishFallbackTimer.current = setTimeout(waitForTranscript, 200)
  }, [
    captureSnapshot,
    clearFinishWaitTimer,
    deliverNoSpeechFallback,
    handleFinalTranscript,
    resolveHeardText,
    setLiveTranscript,
    setOrbState,
    setSpeechState,
    setTranscriptFinalizing,
  ])

  const clearError = useCallback(() => setErrorCode(undefined), [])

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

  useEffect(() => {
    if (!shouldAutoStopListening(appSettings) || speechState !== 'listening') {
      silenceEndpointRef.current?.stop()
      return
    }
    const ep = createSilenceEndpointing({
      getLevel: () => useUiStore.getState().audioLevel,
      isActive: () =>
        useUiStore.getState().speechState === 'listening' &&
        !processingRef.current &&
        !finishingRef.current,
      onEndpoint: () => finishRecording(),
    })
    silenceEndpointRef.current = ep
    ep.start()
    return () => ep.stop()
  }, [
    appSettings.listenEndMode,
    appSettings.voiceListenMode,
    speechState,
    finishRecording,
  ])

  useEffect(() => {
    setOnSpeechOutputEnded(() => {
      if (!isContinuousListenMode(useNozomiStore.getState().settings)) return
      if (window.location.pathname !== '/listen') return
      if (processingRef.current || finishingRef.current) return
      const gen = bumpContinuousGeneration()
      void (async () => {
        await afterSpeechOutputForListen()
        if (!mountedRef.current || !isContinuousGenerationCurrent(gen)) return
        if (processingRef.current || finishingRef.current) return
        beginListening()
      })()
    })
    return () => setOnSpeechOutputEnded(null)
  }, [beginListening])

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
    ],
  )
}
