import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { isVoiceSessionBusy } from '@/features/voice/logic/voiceSessionGuard'

const POLL_MS = 4_000

/** Apply PWA updates only when voice/STT is idle (avoids surprise reload mid-transcribe on iOS). */
export function useDeferredPwaUpdate(): void {
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    immediate: true,
  })
  const updatingRef = useRef(false)

  useEffect(() => {
    if (!needRefresh || updatingRef.current) return
    if (typeof updateServiceWorker !== 'function') return

    const tryApply = () => {
      if (!needRefresh || updatingRef.current) return
      if (isVoiceSessionBusy()) {
        window.setTimeout(tryApply, POLL_MS)
        return
      }
      updatingRef.current = true
      // Dev / no-SW: updateServiceWorker may return void instead of a Promise.
      void Promise.resolve(updateServiceWorker(true)).finally(() => {
        updatingRef.current = false
      })
    }

    tryApply()
  }, [needRefresh, updateServiceWorker])
}
