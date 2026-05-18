/**
 * Platform performance tiers for orb visuals + voice pipeline tuning.
 * iPhone 14 Pro Max (and similar) → `pro` tier: lite canvas + tuned Whisper, not static-only.
 */

import { isIos, isLowMemoryDevice, isMobileDevice } from '@/utils/device'

/** Orb rendering tier (not the same as OrbState). */
export type OrbVisualTier = 'static' | 'lite' | 'full'

/** iOS hardware generation bucket from screen + memory heuristics. */
export type IosDeviceTier = 'legacy' | 'modern' | 'pro'

function screenMinSide(): number {
  if (typeof window === 'undefined') return 0
  return Math.min(window.screen.width, window.screen.height)
}

function screenMaxSide(): number {
  if (typeof window === 'undefined') return 0
  return Math.max(window.screen.width, window.screen.height)
}

/**
 * Classify iOS devices without fragile model IDs.
 * Pro Max / Plus (≥428pt width, tall): iPhone 12 Pro Max through 15 Pro Max class.
 */
export function getIosDeviceTier(): IosDeviceTier {
  if (!isIos()) return 'pro'
  const min = screenMinSide()
  const max = screenMaxSide()
  const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory

  if (typeof dm === 'number' && dm > 0 && dm <= 2) return 'legacy'
  // iPhone 8 / SE (2nd gen): 375×667; very small or short → lighter path
  if (max <= 667 || min < 360) return 'legacy'
  // 14 Pro Max, 15 Pro Max, Plus lines: min width 428–430
  if (min >= 428 || max >= 920) return 'pro'
  // iPhone 12–15, 14 Pro (393+), most daily drivers
  if (min >= 390) return 'modern'
  return 'legacy'
}

export function getOrbVisualTier(): OrbVisualTier {
  if (typeof window === 'undefined') return 'lite'
  if (!isMobileDevice()) return 'full'

  if (isIos()) {
    const tier = getIosDeviceTier()
    return tier === 'legacy' ? 'static' : 'lite'
  }

  if (isLowMemoryDevice()) return 'static'
  return 'lite'
}

/** @deprecated Use getOrbVisualTier() === 'static' */
export function prefersLowPowerOrb(): boolean {
  return getOrbVisualTier() === 'static'
}

export type VoicePlatformTuning = {
  uiAudioLevelThrottleMs: number
  orbAmbienceFpsCap: number
  whisperChunkSec: number
  whisperStrideSec: number
  whisperLongChunkSec: number
  whisperLongStrideSec: number
  maxDecodeSamples16k: number
  sttWorkIdleMs: number
  speechOutputIdleCapMs: number
  micCooldownMs: number
  offlineReleaseDelayMs: number
}

/** Voice / STT knobs tuned per platform (iPhone 14 Pro Max → pro bucket). */
export function getVoicePlatformTuning(): VoicePlatformTuning {
  const ios = isIos()
  const iosTier = getIosDeviceTier()

  if (!ios) {
    return {
      uiAudioLevelThrottleMs: 50,
      orbAmbienceFpsCap: 60,
      whisperChunkSec: 15,
      whisperStrideSec: 3,
      whisperLongChunkSec: 30,
      whisperLongStrideSec: 5,
      maxDecodeSamples16k: 30 * 16_000,
      sttWorkIdleMs: 8_000,
      speechOutputIdleCapMs: 12_000,
      micCooldownMs: 0,
      offlineReleaseDelayMs: 120_000,
    }
  }

  const pro = iosTier === 'pro'
  const legacy = iosTier === 'legacy'

  return {
    uiAudioLevelThrottleMs: legacy ? 80 : pro ? 58 : 66,
    orbAmbienceFpsCap: legacy ? 30 : pro ? 48 : 42,
    whisperChunkSec: legacy ? 4 : pro ? 4 : 5,
    whisperStrideSec: legacy ? 1 : pro ? 1 : 1,
    whisperLongChunkSec: legacy ? 8 : pro ? 8 : 8,
    whisperLongStrideSec: legacy ? 2 : pro ? 2 : 2,
    maxDecodeSamples16k: (legacy ? 10 : pro ? 12 : 12) * 16_000,
    sttWorkIdleMs: legacy ? 4_000 : 5_000,
    speechOutputIdleCapMs: 4_000,
    micCooldownMs: 220,
    offlineReleaseDelayMs: 90_000,
  }
}
