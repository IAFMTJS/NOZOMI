import { useEffect, useRef } from 'react'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'
import {
  invalidateMobileVoiceBootFlight,
  isMobileVoiceBootComplete,
  mobileVoiceBootStorageKey,
  needsMobileVoiceBoot,
  readMobileVoiceBootCache,
  runMobileVoiceBoot,
} from '@/features/voice/logic/mobileVoiceBoot'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'

/**
 * After JSON data is ready, load Whisper on mobile before showing the app shell.
 */
export function useMobileVoiceBoot(): void {
  const dataReady = useUiStore((s) => s.dataReady)
  const setVoiceBootPhase = useUiStore((s) => s.setVoiceBootPhase)
  const setVoiceBootProgress = useUiStore((s) => s.setVoiceBootProgress)
  const setVoiceBootError = useUiStore((s) => s.setVoiceBootError)
  const speechInputLang = useNozomiStore((s) => s.settings.speechInputLang)
  const whisperModel = useNozomiStore((s) => s.settings.whisperModel)
  const sttCloudProvider = useNozomiStore((s) => s.settings.sttCloudProvider)
  const runGenRef = useRef(0)
  const bootKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!dataReady) return

    const recognitionLang = resolveSpeechRecognitionLang(speechInputLang)
    if (!needsMobileVoiceBoot(recognitionLang)) {
      setVoiceBootPhase('skipped')
      setVoiceBootProgress(null)
      setVoiceBootError(null)
      bootKeyRef.current = null
      return
    }

    const bootKey = mobileVoiceBootStorageKey(recognitionLang)
    const bootKeyChanged = bootKeyRef.current !== null && bootKeyRef.current !== bootKey
    bootKeyRef.current = bootKey
    const gen = ++runGenRef.current
    if (bootKeyChanged) {
      invalidateMobileVoiceBootFlight()
    }

    if (isMobileVoiceBootComplete(recognitionLang)) {
      setVoiceBootPhase('ready')
      setVoiceBootProgress(100)
      setVoiceBootError(null)
      return
    }

    const hadSessionMarker = readMobileVoiceBootCache() === bootKey
    setVoiceBootPhase('loading')
    setVoiceBootProgress(hadSessionMarker ? 72 : 0)
    setVoiceBootError(null)

    void runMobileVoiceBoot(recognitionLang, (pct) => {
      if (runGenRef.current !== gen) return
      setVoiceBootProgress(pct)
    })
      .then(() => {
        if (runGenRef.current !== gen) return
        setVoiceBootPhase('ready')
        setVoiceBootProgress(100)
        setVoiceBootError(null)
      })
      .catch((err) => {
        if (runGenRef.current !== gen) return
        setVoiceBootPhase('error')
        setVoiceBootError(
          err instanceof Error ? err.message : 'Speech model could not load',
        )
      })
  }, [
    dataReady,
    speechInputLang,
    whisperModel,
    sttCloudProvider,
    setVoiceBootError,
    setVoiceBootPhase,
    setVoiceBootProgress,
  ])
}
