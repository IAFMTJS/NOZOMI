import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { preloadOfflineStt } from '@/features/voice/logic/offlineStt'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import { getSttEngine, resolveSttEngineForLang } from '@/features/voice/logic/sttEngine'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'

/** /listen preloads via useOfflineSttPreload — avoid duplicate warm on iOS. */
const WHISPER_WARM_ROUTES = new Set(['/', '/chat'])

/** Warm Whisper WASM on home/chat before the user opens /listen. */
export function useDeferredWhisperPreload(): void {
  const { pathname } = useLocation()
  const dataReady = useUiStore((s) => s.dataReady)
  const speechInputLang = useNozomiStore((s) => s.settings.speechInputLang)
  const whisperModel = useNozomiStore((s) => s.settings.whisperModel)

  useEffect(() => {
    if (!dataReady || !WHISPER_WARM_ROUTES.has(pathname)) return
    const recognitionLang = resolveSpeechRecognitionLang(speechInputLang)
    const engine = resolveSttEngineForLang(getSttEngine(), recognitionLang)
    if (engine !== 'local') return

    const warm = () => preloadOfflineStt(recognitionLang)
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(warm, { timeout: 12_000 })
      return () => cancelIdleCallback(id)
    }
    const timer = window.setTimeout(warm, 600)
    return () => window.clearTimeout(timer)
  }, [pathname, dataReady, speechInputLang, whisperModel])
}
