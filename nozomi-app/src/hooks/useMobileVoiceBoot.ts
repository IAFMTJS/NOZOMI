import { useEffect } from 'react'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import {
  invalidateMobileVoiceBootFlight,
  isMobileVoiceBootComplete,
  mobileVoiceBootStorageKey,
  needsMobileVoiceBoot,
  readMobileVoiceBootCache,
  runMobileVoiceBoot,
} from '@/features/voice/logic/mobileVoiceBoot'
import type { VoiceBootLoadStatus } from '@/features/voice/logic/voiceBootStatus'
import { INITIAL_VOICE_BOOT_STATUS } from '@/features/voice/logic/voiceBootStatus'

function applyBootStatusToStore(status: VoiceBootLoadStatus): void {
  const ui = useUiStore.getState()
  ui.setVoiceBootLoadPhase(status.phase)
  ui.setVoiceBootDownloadPercent(status.downloadPercent)
  const legacyPct =
    status.phase === 'ready'
      ? 100
      : status.phase === 'downloading_weights'
        ? status.downloadPercent
        : null
  ui.setVoiceBootProgress(legacyPct)
}

/** Start mobile Whisper boot once data is ready; drives honest phase labels in VoiceBootScreen. */
export function useMobileVoiceBoot(): void {
  const dataReady = useUiStore((s) => s.dataReady)
  const setVoiceBootPhase = useUiStore((s) => s.setVoiceBootPhase)
  const setVoiceBootError = useUiStore((s) => s.setVoiceBootError)
  const speechInputLang = useNozomiStore((s) => s.settings.speechInputLang)

  useEffect(() => {
    if (!dataReady) return

    const recognitionLang = resolveSpeechRecognitionLang(speechInputLang)

    if (!needsMobileVoiceBoot(recognitionLang)) {
      setVoiceBootPhase('skipped')
      setVoiceBootError(null)
      applyBootStatusToStore({ phase: 'ready', downloadPercent: null })
      return
    }

    const bootKey = mobileVoiceBootStorageKey(recognitionLang)
    const prevKey = readMobileVoiceBootCache()
    const langChanged = prevKey !== null && prevKey !== bootKey

    if (langChanged) {
      invalidateMobileVoiceBootFlight()
    }

    if (isMobileVoiceBootComplete(recognitionLang)) {
      setVoiceBootPhase('ready')
      setVoiceBootError(null)
      applyBootStatusToStore({ phase: 'ready', downloadPercent: null })
      return
    }

    setVoiceBootPhase('loading')
    setVoiceBootError(null)
    applyBootStatusToStore(INITIAL_VOICE_BOOT_STATUS)

    void runMobileVoiceBoot(recognitionLang, applyBootStatusToStore)
      .then(() => {
        setVoiceBootPhase('ready')
        applyBootStatusToStore({ phase: 'ready', downloadPercent: null })
      })
      .catch((err) => {
        setVoiceBootPhase('error')
        setVoiceBootError(
          err instanceof Error ? err.message : 'Speech model could not load',
        )
      })
  }, [dataReady, speechInputLang, setVoiceBootError, setVoiceBootPhase])
}
