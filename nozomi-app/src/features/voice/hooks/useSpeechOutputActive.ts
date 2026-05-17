import { useSyncExternalStore } from 'react'
import {
  isAnyTtsOutputActive,
  subscribeTtsOutput,
} from '@/features/voice/logic/ttsOutputState'

/** True while assistant TTS is playing (browser synth or cloud Audio). */
export function useSpeechOutputActive(): boolean {
  return useSyncExternalStore(
    subscribeTtsOutput,
    isAnyTtsOutputActive,
    () => false,
  )
}
