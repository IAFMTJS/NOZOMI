import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

if (import.meta.env.DEV) {
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) void reg.unregister()
    })
  }
  if ('caches' in window) {
    void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

