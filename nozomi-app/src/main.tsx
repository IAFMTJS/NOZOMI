import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { getSttEngine } from '@/features/voice/logic/sttEngine'
import { preloadOfflineStt } from '@/features/voice/logic/offlineStt'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import { useNozomiStore } from '@/store/useNozomiStore'

function scheduleBootWhisperPreload(): void {
  if (getSttEngine() !== 'local') return
  const lang = resolveSpeechRecognitionLang(
    useNozomiStore.getState().settings.speechInputLang,
  )
  preloadOfflineStt(lang)
}

if (useNozomiStore.persist.hasHydrated()) {
  scheduleBootWhisperPreload()
} else {
  useNozomiStore.persist.onFinishHydration(scheduleBootWhisperPreload)
}

if (import.meta.env.DEV) {
  // Drop stale production SWs in dev; keep Cache API entries (Whisper/onnx) so reloads
  // do not re-download ~40MB and thrash memory on mobile.
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) void reg.unregister()
    })
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

