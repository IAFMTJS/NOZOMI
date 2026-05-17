import { isIos } from '@/utils/device'
import { releaseOfflineSttPipeline } from '@/features/voice/logic/offlineStt'

let lastTouchAt = 0
let releaseTimer: number | null = null

const RELEASE_DELAY_MS = isIos() ? 90_000 : 45_000

export function touchOfflineSttPipeline(): void {
  lastTouchAt = Date.now()
  if (releaseTimer) {
    clearTimeout(releaseTimer)
    releaseTimer = null
  }
}

/** Avoid dropping Whisper on React StrictMode remount or brief route flicker (iOS). */
export function scheduleReleaseOfflineSttPipeline(
  delayMs = RELEASE_DELAY_MS,
): void {
  touchOfflineSttPipeline()
  if (releaseTimer) clearTimeout(releaseTimer)
  releaseTimer = window.setTimeout(() => {
    releaseTimer = null
    if (Date.now() - lastTouchAt < delayMs - 500) return
    releaseOfflineSttPipeline()
  }, delayMs)
}

export function cancelScheduledReleaseOfflineStt(): void {
  if (releaseTimer) {
    clearTimeout(releaseTimer)
    releaseTimer = null
  }
}
