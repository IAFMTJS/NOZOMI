import { useEffect, useRef } from 'react'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'
import {
  cancelListening,
  isListenSessionActive,
  releaseSharedMicrophone,
} from '@/features/voice/logic/speechService'
import {
  isOfflineSttReady,
  preloadOfflineStt,
  subscribeOfflineSttLoadProgress,
  whenOfflineSttReady,
} from '@/features/voice/logic/offlineStt'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import { getSttEngine, resolveSttEngineForLang } from '@/features/voice/logic/sttEngine'
import { warmJapaneseVoices } from '@/features/voice/logic/japaneseVoicePicker'
import { isMobileVoiceBootComplete } from '@/features/voice/logic/mobileVoiceBoot'
import { touchOfflineSttPipeline } from '@/features/voice/logic/offlineSttLifecycle'
import { isMobileDevice } from '@/utils/device'
import { voiceDebug, voiceDebugWarn } from '@/features/voice/logic/voiceDebug'

type ResetTurnFlags = () => void

/** Preload Whisper on /listen when local STT is active; warm TTS voices. */
export function useOfflineSttPreload(
  onListenPage: boolean,
  recognitionLang: string,
  setOfflineSttReady: (ready: boolean) => void,
  setOfflineSttLoadPercent: (pct: number | null) => void,
  resetTurnFlags: ResetTurnFlags,
): void {
  const prevRecognitionLangRef = useRef<string | null>(null)
  const setSpeechState = useUiStore((s) => s.setSpeechState)
  const setOrbState = useUiStore((s) => s.setOrbState)
  const setLiveTranscript = useUiStore((s) => s.setLiveTranscript)

  useEffect(() => {
    const prevLang = prevRecognitionLangRef.current
    prevRecognitionLangRef.current = recognitionLang
    const langChanged = prevLang !== null && prevLang !== recognitionLang

    if (langChanged && isListenSessionActive()) {
      voiceDebug('ui:lang-change-cancel', { lang: recognitionLang, prevLang })
      cancelListening()
      releaseSharedMicrophone()
      resetTurnFlags()
      setSpeechState('idle')
      setOrbState('idle')
      setLiveTranscript('')
    }

    const engine = resolveSttEngineForLang(getSttEngine(), recognitionLang)
    if (engine !== 'local') {
      setOfflineSttReady(true)
      setOfflineSttLoadPercent(null)
      return
    }

    const syncReady = () => {
      if (isOfflineSttReady(recognitionLang)) setOfflineSttReady(true)
    }
    syncReady()
    const readyPoll = window.setInterval(syncReady, 400)

    if (!onListenPage) {
      if (!isMobileDevice()) preloadOfflineStt(recognitionLang)
      return () => window.clearInterval(readyPoll)
    }

    // Mobile: boot gate caches weights; never load WASM on /listen (OOM with mic/decode).
    if (isMobileDevice()) {
      if (isMobileVoiceBootComplete(recognitionLang)) {
        touchOfflineSttPipeline()
      }
      setOfflineSttReady(isOfflineSttReady(recognitionLang))
      setOfflineSttLoadPercent(
        isOfflineSttReady(recognitionLang) ? 100 : null,
      )
      return () => window.clearInterval(readyPoll)
    }

    setOfflineSttReady(isOfflineSttReady(recognitionLang))
    const unsubProgress = subscribeOfflineSttLoadProgress((pct) => {
      setOfflineSttLoadPercent(
        isOfflineSttReady(recognitionLang) ? 100 : pct,
      )
    })
    preloadOfflineStt(recognitionLang, { force: true })

    void whenOfflineSttReady(recognitionLang)
      .then(() => {
        if (
          resolveSpeechRecognitionLang(useNozomiStore.getState().settings.speechInputLang) !==
          recognitionLang
        ) {
          return
        }
        setOfflineSttReady(true)
        if (isOfflineSttReady(recognitionLang)) {
          setOfflineSttLoadPercent(100)
        }
      })
      .catch((err) => {
        voiceDebugWarn('ui:offline-preload-failed', {
          error: err instanceof Error ? err.message : String(err),
        })
      })
      .finally(() => {
        window.clearInterval(readyPoll)
      })

    if ('speechSynthesis' in window) {
      const warmVoices = () => warmJapaneseVoices()
      warmVoices()
      window.speechSynthesis.addEventListener('voiceschanged', warmVoices)
      return () => {
        window.clearInterval(readyPoll)
        unsubProgress()
        window.speechSynthesis.removeEventListener('voiceschanged', warmVoices)
      }
    }
    return () => {
      window.clearInterval(readyPoll)
      unsubProgress()
    }
  }, [
    onListenPage,
    recognitionLang,
    resetTurnFlags,
    setLiveTranscript,
    setOfflineSttLoadPercent,
    setOfflineSttReady,
    setOrbState,
    setSpeechState,
  ])
}
