/**
 * Cross-module turn coordination — prevents continuous / barge-in / auto-stop races.
 */

let continuousGeneration = 0
let ttsOutputStartedAt = 0
let bargeInArmedAt = 0

export function bumpContinuousGeneration(): number {
  continuousGeneration += 1
  return continuousGeneration
}

export function isContinuousGenerationCurrent(gen: number): boolean {
  return gen === continuousGeneration
}

export function invalidateContinuousListen(): void {
  continuousGeneration += 1
}

/** Ignore mic spikes right after TTS starts (speaker bleed). */
export function markTtsOutputStarted(): void {
  ttsOutputStartedAt = performance.now()
  bargeInArmedAt = ttsOutputStartedAt + 480
}

export function isBargeInArmed(): boolean {
  return performance.now() >= bargeInArmedAt
}

export function resetTtsOutputTiming(): void {
  ttsOutputStartedAt = 0
  bargeInArmedAt = 0
}
