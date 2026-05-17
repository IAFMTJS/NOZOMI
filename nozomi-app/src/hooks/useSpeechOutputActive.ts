import { useSyncExternalStore } from 'react'
import { isSpeechOutputActive } from '@/systems/speech/speechService'

/** True while browser TTS is speaking or queued (independent of orb state). */
export function useSpeechOutputActive(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!('speechSynthesis' in window)) return () => {}
      const id = window.setInterval(onStoreChange, 80)
      return () => clearInterval(id)
    },
    isSpeechOutputActive,
    () => false,
  )
}
