import { useEffect } from 'react'
import { shouldSkipIdleWhisperPreload } from '@/features/voice/logic/iosMemoryBudget'
import { preloadOfflineStt } from '@/features/voice/logic/offlineStt'
import { getSttEngine, resolveSttEngineForLang } from '@/features/voice/logic/sttEngine'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import { useNozomiStore } from '@/store/useNozomiStore'

/** Warm Whisper WASM on Settings when local STT is selected (before user opens /listen). */
export function useWhisperPreloadFromSettings(): void {
  const speechInputLang = useNozomiStore((s) => s.settings.speechInputLang)
  const whisperModel = useNozomiStore((s) => s.settings.whisperModel)

  useEffect(() => {
    if (shouldSkipIdleWhisperPreload()) return
    const recognitionLang = resolveSpeechRecognitionLang(speechInputLang)
    const engine = resolveSttEngineForLang(getSttEngine(), recognitionLang)
    if (engine !== 'local') return
    preloadOfflineStt(recognitionLang)
  }, [speechInputLang, whisperModel])
}
