import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

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

