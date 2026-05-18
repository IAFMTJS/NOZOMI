import {
  isAnyTtsOutputActive,
  subscribeTtsOutput,
} from '@/features/voice/logic/ttsOutputState'
import { whenSttWorkIdle } from '@/features/voice/logic/listenLifecycle'
import { reconcileStuckBrowserSynth } from '@/features/voice/logic/ttsOutputState'
import { getVoicePlatformTuning } from '@/utils/device'

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
  const tuning = getVoicePlatformTuning()
  await whenAnySpeechOutputIdle(tuning.speechOutputIdleCapMs)
  reconcileStuckBrowserSynth()
  await new Promise((r) => setTimeout(r, tuning.micCooldownMs))
  await whenSttWorkIdle(tuning.sttWorkIdleMs)
}
