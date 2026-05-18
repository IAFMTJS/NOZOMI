import { isIos } from '@/utils/device'
import { voiceDebug } from '@/features/voice/logic/voiceDebug'

/**
 * Let Safari finish allocating the ONNX session before mic, TTS warm, or UI at 100%.
 * Prevents tab reloads on iPhone when Whisper finishes loading.
 */
export async function yieldForIosMemoryPressure(reason: string): Promise<void> {
  if (!isIos()) return
  voiceDebug('offline-stt:ios-yield-start', { reason })
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
  await new Promise((r) => setTimeout(r, 400))
  if (typeof requestIdleCallback === 'function') {
    await new Promise<void>((resolve) => {
      requestIdleCallback(() => resolve(), { timeout: 1_200 })
    })
  } else {
    await new Promise((r) => setTimeout(r, 250))
  }
  voiceDebug('offline-stt:ios-yield-done', { reason })
}

/** iOS cannot safely use whisper-small in-browser (tab reload). */
export function effectiveWhisperTierForPlatform(
  tier: 'tiny' | 'small',
): 'tiny' | 'small' {
  if (isIos() && tier === 'small') return 'tiny'
  return tier
}
