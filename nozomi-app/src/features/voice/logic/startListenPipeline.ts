import {
  isAnyTtsOutputActive,
  subscribeTtsOutput,
} from '@/features/voice/logic/ttsOutputState'
import { whenSttWorkIdle } from '@/features/voice/logic/listenLifecycle'
import { isIos } from '@/utils/device'

const SPEECH_OUTPUT_IDLE_MAX_MS = 12_000

export function whenAnySpeechOutputIdle(maxWaitMs = 5000): Promise<void> {
  if (!isAnyTtsOutputActive()) return Promise.resolve()
  return new Promise((resolve) => {
    const started = Date.now()
    const unsub = subscribeTtsOutput(() => {
      if (!isAnyTtsOutputActive()) {
        unsub()
        resolve()
      }
    })
    const poll = () => {
      if (!isAnyTtsOutputActive() || Date.now() - started >= maxWaitMs) {
        unsub()
        resolve()
        return
      }
      requestAnimationFrame(poll)
    }
    poll()
  })
}

/** Wait for TTS + cooldown + STT idle before opening the mic (shared by orb tap and barge-in). */
export async function afterSpeechOutputForListen(): Promise<void> {
  const idleCap = isIos() ? 4_000 : SPEECH_OUTPUT_IDLE_MAX_MS
  await whenAnySpeechOutputIdle(idleCap)
  await new Promise((r) =>
    setTimeout(
      r,
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 220 : 0,
    ),
  )
  await whenSttWorkIdle(isIos() ? 5_000 : 8_000)
}
