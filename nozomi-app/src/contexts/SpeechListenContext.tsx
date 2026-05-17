import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { useConversation } from '@/hooks/useConversation'
import { useNozomiStore } from '@/store/useNozomiStore'
import {
  attachListeningCallbacks,
  cancelListening,
  endListenSessionAfterTurn,
  finalizeListening,
  getListenSignals,
  markListenTurnHandled,
  getCapturedTranscript,
  getSttDebugState,
  markListenArmedFromGesture,
  syncCaptureFromDisplay,
  isListenSessionActive,
  releaseSharedMicrophone,
  micNeedsSecureContext,
  primeMicrophonePermission,
  speechSupported,
  startListening,
  stopSpeaking,
  whenSttWorkIdle,
  type SpeechError,
  type SpeechErrorCode,
} from '@/systems/speech/speechService'
import { resolveSpeechRecognitionLang } from '@/systems/speech/speechLocale'
import { getSttEngine } from '@/systems/speech/sttEngine'
import {
  getLastOfflineSttError,
  preloadOfflineStt,
  whenOfflineSttReady,
} from '@/systems/speech/offlineStt'
import {
  installVoiceDebugConsole,
  voiceDebug,
  voiceDebugCapture,
  voiceDebugError,
  voiceDebugWarn,
} from '@/systems/speech/voiceDebug'
import type { SpeechState } from '@/types/domain'

type SpeechListenApi = {
  armAndGoToListen: () => Promise<void>
  beginListening: () => boolean
  finishRecording: () => void
  cancelSession: () => void
  attachToActiveSession: () => boolean
  detachUi: () => void
  errorCode: SpeechErrorCode | undefined
  clearError: () => void
  offlineSttReady: boolean
}

const SpeechListenContext = createContext<SpeechListenApi | null>(null)

function useSpeechListenController(): SpeechListenApi {
  const navigate = useNavigate()
  const { sendUserMessage, deliverNozomi } = useConversation()
  const dataReady = useNozomiStore((s) => s.dataReady)
  const speechInputLang = useNozomiStore((s) => s.settings.speechInputLang)
  const setOrbState = useNozomiStore((s) => s.setOrbState)
  const setSpeechState = useNozomiStore((s) => s.setSpeechState)
  const setAudioLevel = useNozomiStore((s) => s.setAudioLevel)
  const setLiveTranscript = useNozomiStore((s) => s.setLiveTranscript)
  const [errorCode, setErrorCode] = useState<SpeechErrorCode | undefined>()
  const [offlineSttReady, setOfflineSttReady] = useState(false)
  const mountedRef = useRef(true)
  const processingRef = useRef(false)
  const everHeardRef = useRef(false)
  const lastTranscriptRef = useRef('')
  const pendingInterimRef = useRef('')
  const interimRafRef = useRef<number | null>(null)
  const finishFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const voiceTurnGenRef = useRef(0)
  const noSpeechFallbackDeliveredRef = useRef(false)

  const recognitionLang = resolveSpeechRecognitionLang(speechInputLang)

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
      useNozomiStore.getState().liveTranscript.trim() ||
      getCapturedTranscript()
    ).trim()
  }, [])

  const captureSnapshot = useCallback((): import('@/systems/speech/voiceDebug').VoiceCaptureSnapshot => {
    return {
      lastRef: lastTranscriptRef.current,
      pendingInterim: pendingInterimRef.current,
      liveTranscript: useNozomiStore.getState().liveTranscript,
      captured: getCapturedTranscript(),
      resolved: resolveHeardText(),
      everHeard: everHeardRef.current,
      processing: processingRef.current,
      sessionActive: isListenSessionActive(),
    }
  }, [resolveHeardText])

  useEffect(() => {
    setOfflineSttReady(false)
    preloadOfflineStt(recognitionLang)
    void whenOfflineSttReady(recognitionLang).then(() => {
      if (!mountedRef.current) return
      if (resolveSpeechRecognitionLang(useNozomiStore.getState().settings.speechInputLang) !== recognitionLang) {
        return
      }
      setOfflineSttReady(true)
    })
    if ('speechSynthesis' in window) {
      const warmVoices = () => {
        window.speechSynthesis.getVoices()
      }
      warmVoices()
      window.speechSynthesis.addEventListener('voiceschanged', warmVoices)
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', warmVoices)
      }
    }
  }, [recognitionLang])

  useEffect(() => {
    installVoiceDebugConsole(() => ({
      ui: captureSnapshot(),
      speechState: useNozomiStore.getState().speechState,
      orbState: useNozomiStore.getState().orbState,
      speechInputLang,
      recognitionLang,
      stt: getSttDebugState(),
    }))
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (finishFallbackTimer.current) {
        clearTimeout(finishFallbackTimer.current)
      }
      if (interimRafRef.current) {
        cancelAnimationFrame(interimRafRef.current)
      }
    }
  }, [captureSnapshot, recognitionLang, speechInputLang])

  const waitForData = useCallback(async () => {
    if (dataReady) return
    for (let i = 0; i < 120; i++) {
      if (useNozomiStore.getState().dataReady) return
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
    setSpeechState('idle')
    setOrbState('idle')
    setAudioLevel(0)
  }, [captureSnapshot, deliverNozomi, setAudioLevel, setOrbState, setSpeechState])

  const handleFinalTranscript = useCallback(
    async (text: string) => {
      if (processingRef.current || !mountedRef.current) {
        voiceDebug('ui:final-skipped', {
          reason: processingRef.current ? 'already-processing' : 'unmounted',
          incoming: text.slice(0, 80),
        })
        return
      }
      processingRef.current = true
      voiceDebug('ui:final-start', { incoming: text.slice(0, 160), ...captureSnapshot() })
      markListenTurnHandled()
      if (finishFallbackTimer.current) {
        clearTimeout(finishFallbackTimer.current)
        finishFallbackTimer.current = null
      }

      const trimmed = (text.trim() || resolveHeardText()).trim()
      if (!trimmed) {
        voiceDebugWarn('ui:final-empty', captureSnapshot())
        processingRef.current = false
        endListenSessionAfterTurn()
        deliverNoSpeechFallback()
        return
      }

      setLiveTranscript(trimmed)
      setSpeechState('processing')
      setOrbState('thinking')

      const turnId = ++voiceTurnGenRef.current
      const shouldAbort = () => voiceTurnGenRef.current !== turnId

      try {
        await waitForData()
        await Promise.race([
          sendUserMessage(trimmed, 'voice', { shouldAbort }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('voice-turn-timeout')), 12000),
          ),
        ])
        if (shouldAbort()) return
        setSpeechState('idle')
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
        setSpeechState('idle')
      } finally {
        endListenSessionAfterTurn()
        everHeardRef.current = false
        processingRef.current = false
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
      waitForData,
    ],
  )

  const handleError = useCallback(
    (err: SpeechError) => {
      if (!mountedRef.current) return
      voiceDebugError('ui:stt-error', { code: err.code, message: err.message })
      clearFinishWaitTimer()
      processingRef.current = false
      cancelListening()
      releaseSharedMicrophone()
      setOrbState('idle')
      setSpeechState('error')
      setErrorCode(err.code)
      setAudioLevel(0)
    },
    [clearFinishWaitTimer, setAudioLevel, setOrbState, setSpeechState],
  )

  const handleStateChange = useCallback(
    (state: SpeechState) => {
      if (!mountedRef.current) return
      if (state === 'idle' && processingRef.current) {
        voiceDebug('ui:speech-state-ignored', { state, reason: 'turn-processing' })
        return
      }
      voiceDebug('ui:speech-state', { state })
      setSpeechState(state)
      if (state === 'listening') {
        setErrorCode(undefined)
        setOrbState('listening')
      }
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
          if (!processingRef.current) {
            setLiveTranscript(pendingInterimRef.current)
          }
        })
      },
      onResult: (text: string) => {
        if (processingRef.current) {
          voiceDebug('ui:onResult-skipped', { reason: 'processing' })
          return
        }
        voiceDebug('ui:onResult', { length: text.length, text: text.slice(0, 160) })
        void handleFinalTranscript(text)
      },
      onError: handleError,
      onLevel: setAudioLevel,
    }),
    [
      handleError,
      handleFinalTranscript,
      handleStateChange,
      setAudioLevel,
      setLiveTranscript,
    ],
  )

  const listenOptions = useMemo(
    () => ({ lang: recognitionLang }),
    [recognitionLang],
  )

  const beginListening = useCallback(() => {
    if (!speechSupported().stt) {
      setOrbState('idle')
      setSpeechState('error')
      setErrorCode('not-supported')
      return false
    }

    if (processingRef.current) {
      voiceDebugWarn('ui:begin-blocked', { reason: 'turn-processing' })
      return false
    }

    clearFinishWaitTimer()
    noSpeechFallbackDeliveredRef.current = false

    setErrorCode(undefined)
    setLiveTranscript('')
    everHeardRef.current = false
    lastTranscriptRef.current = ''
    pendingInterimRef.current = ''
    stopSpeaking()
    setSpeechState('permission_pending')
    setOrbState('idle')
    markListenArmedFromGesture()
    voiceDebug('ui:beginListening', { lang: recognitionLang })

    void whenSttWorkIdle().then(() => {
      if (!mountedRef.current) return
      const state = useNozomiStore.getState().speechState
      if (state !== 'permission_pending' && state !== 'listening') return
      startListening(buildCallbacks(), listenOptions)
    })
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

    markListenArmedFromGesture()
    voiceDebug('ui:armAndGoToListen', { lang: recognitionLang })

    // Priming opens then closes the mic; on Windows that races with local STT capture.
    if (getSttEngine() === 'browser') {
      const granted = await primeMicrophonePermission()
      if (!granted) {
        setErrorCode('not-allowed')
        setSpeechState('error')
        navigate('/listen')
        return
      }
    }

    beginListening()
    navigate('/listen', { state: { autoStart: true } })
  }, [
    navigate,
    recognitionLang,
    setLiveTranscript,
    setOrbState,
    setSpeechState,
  ])

  const attachToActiveSession = useCallback(() => {
    if (!isListenSessionActive()) return false
    voiceDebug('ui:attach-session')
    setErrorCode(undefined)
    attachListeningCallbacks(buildCallbacks())
    const speechState = useNozomiStore.getState().speechState
    if (speechState === 'listening') {
      setOrbState('listening')
    }
    return true
  }, [buildCallbacks, setOrbState])

  const detachUi = useCallback(() => {
    setAudioLevel(0)
  }, [setAudioLevel])

  const cancelSession = useCallback(() => {
    voiceDebug('ui:cancel', captureSnapshot())
    clearFinishWaitTimer()
    voiceTurnGenRef.current++
    noSpeechFallbackDeliveredRef.current = false
    processingRef.current = false
    everHeardRef.current = false
    cancelListening()
    releaseSharedMicrophone()
    setAudioLevel(0)
    setLiveTranscript('')
    setOrbState('idle')
    setSpeechState('idle')
    setErrorCode(undefined)
  }, [captureSnapshot, clearFinishWaitTimer, setAudioLevel, setLiveTranscript, setOrbState, setSpeechState])

  const finishRecording = useCallback(() => {
    if (processingRef.current) {
      voiceDebug('ui:finish-skipped', { reason: 'processing' })
      return
    }
    voiceDebugCapture('ui:finish', captureSnapshot())

    clearFinishWaitTimer()

    if (interimRafRef.current) {
      cancelAnimationFrame(interimRafRef.current)
      interimRafRef.current = null
    }
    if (pendingInterimRef.current.trim()) {
      lastTranscriptRef.current = pendingInterimRef.current
      setLiveTranscript(pendingInterimRef.current)
    }

    const heardNow = resolveHeardText()
    if (heardNow) syncCaptureFromDisplay(heardNow)

    setSpeechState('processing')
    setOrbState('thinking')

    if (isListenSessionActive()) {
      finalizeListening()
    }

    if (heardNow) {
      voiceDebug('ui:finish-immediate', { length: heardNow.length })
      void handleFinalTranscript(heardNow)
      return
    }

    const started = Date.now()
    const maxWait =
      getSttEngine() === 'local'
        ? 45_000
        : everHeardRef.current
          ? 6000
          : 8000
    voiceDebug('ui:finish-wait', { maxWaitMs: maxWait, everHeard: everHeardRef.current })
    const waitForTranscript = () => {
      if (processingRef.current) return
      if (useNozomiStore.getState().speechState === 'error') return
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
      if (Date.now() - started < maxWait) {
        finishFallbackTimer.current = setTimeout(waitForTranscript, 100)
        return
      }
      if (!processingRef.current) {
        voiceDebugWarn('ui:finish-wait-timeout', {
          waitedMs: Date.now() - started,
          ...captureSnapshot(),
        })
        endListenSessionAfterTurn()
        deliverNoSpeechFallback()
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
  ])

  const clearError = useCallback(() => setErrorCode(undefined), [])

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

export function SpeechListenProvider({ children }: { children: ReactNode }) {
  const api = useSpeechListenController()
  return (
    <SpeechListenContext.Provider value={api}>
      {children}
    </SpeechListenContext.Provider>
  )
}

export function useSpeechListen(): SpeechListenApi {
  const ctx = useContext(SpeechListenContext)
  if (!ctx) {
    throw new Error('useSpeechListen must be used within SpeechListenProvider')
  }
  return ctx
}
