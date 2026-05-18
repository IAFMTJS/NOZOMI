import { getVoicePlatformTuning } from '@/utils/device'
import { releaseOfflineSttPipeline } from '@/features/voice/logic/offlineStt'
import { isVoiceSessionBusy } from '@/features/voice/logic/voiceSessionGuard'

let lastTouchAt = 0
let releaseTimer: number | null = null

/** Keep Whisper warm between turns on /listen (files stay in Cache API). */
function releaseDelayMs(): number {
  return getVoicePlatformTuning().offlineReleaseDelayMs
}

export function touchOfflineSttPipeline(): void {
  lastTouchAt = Date.now()
  if (releaseTimer) {
    clearTimeout(releaseTimer)
    releaseTimer = null
  }
}

/** Avoid dropping Whisper on React StrictMode remount or brief route flicker (iOS). */
export function scheduleReleaseOfflineSttPipeline(
  delayMs = releaseDelayMs(),
): void {
  touchOfflineSttPipeline()
  if (releaseTimer) clearTimeout(releaseTimer)
  releaseTimer = window.setTimeout(() => {
    releaseTimer = null
    if (Date.now() - lastTouchAt < delayMs - 500) return
    if (isVoiceSessionBusy()) {
      scheduleReleaseOfflineSttPipeline(delayMs)
      return
    }
    releaseOfflineSttPipeline()
  }, delayMs)
}

export function cancelScheduledReleaseOfflineStt(): void {
  if (releaseTimer) {
    clearTimeout(releaseTimer)
    releaseTimer = null
  }
}
