/**
 * Serializes heavy work on iOS Safari to avoid tab reloads from RAM spikes.
 * Whisper WASM, AudioContexts, decode buffers, and TTS must not peak together.
 */
import { releaseDecodeContext } from '@/features/voice/logic/audioDecode'
import { voiceDebug } from '@/features/voice/logic/voiceDebug'
import { isIos } from '@/utils/device'
import type { OrbState } from '@/types/domain'
import type { SpeechState } from '@/types/domain'

export type IosMemoryResource =
  | 'whisper-model'
  | 'whisper-infer'
  | 'mic-analyser'
  | 'decode-ctx'
  | 'browser-level'

const activeResources = new Set<IosMemoryResource>()
let barrierTail: Promise<void> = Promise.resolve()

export function iosTrackResource(resource: IosMemoryResource, on: boolean): void {
  if (!isIos()) return
  if (on) activeResources.add(resource)
  else activeResources.delete(resource)
}

export function iosActiveResources(): ReadonlySet<IosMemoryResource> {
  return activeResources
}

export function iosHasActiveResource(...resources: IosMemoryResource[]): boolean {
  return resources.some((r) => activeResources.has(r))
}

/** Idle Whisper preload (home/settings) — skip on iOS to avoid overlapping with navigation. */
export function shouldSkipIdleWhisperPreload(): boolean {
  return isIos()
}

/** True when canvas orb should stay static to save GPU/RAM during voice. */
export function isIosVoiceHeavyUi(orbState: OrbState, speechState: SpeechState): boolean {
  if (!isIos()) return false
  return (
    orbState === 'listening' ||
    orbState === 'thinking' ||
    speechState === 'listening' ||
    speechState === 'processing' ||
    speechState === 'permission_pending'
  )
}

type BarrierOpts = { light?: boolean }

/**
 * Queued memory barrier — concurrent callers run yields in order, not in parallel.
 */
export async function iosMemoryBarrier(
  phase: string,
  opts: BarrierOpts = {},
): Promise<void> {
  if (!isIos()) return
  const run = async () => {
    voiceDebug('ios-mem:barrier-start', {
      phase,
      active: [...activeResources],
    })
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
    await new Promise((r) => setTimeout(r, opts.light ? 120 : 400))
    if (!opts.light && typeof requestIdleCallback === 'function') {
      await new Promise<void>((resolve) => {
        requestIdleCallback(() => resolve(), { timeout: 1_200 })
      })
    } else if (!opts.light) {
      await new Promise((r) => setTimeout(r, 250))
    }
    voiceDebug('ios-mem:barrier-done', { phase })
  }
  const next = barrierTail.then(run)
  barrierTail = next.catch(() => {})
  return next
}

/** @deprecated Use iosMemoryBarrier — kept for existing call sites. */
export const yieldForIosMemoryPressure = iosMemoryBarrier

export async function iosPrepareForWhisperLoad(): Promise<void> {
  await iosMemoryBarrier('pipeline-ready')
}

export async function iosPrepareForAudioDecode(): Promise<void> {
  releaseDecodeContext()
  iosTrackResource('decode-ctx', false)
  await iosMemoryBarrier('before-decode', { light: true })
}

export async function iosPrepareForWhisperInfer(): Promise<void> {
  releaseDecodeContext()
  iosTrackResource('decode-ctx', false)
  await iosMemoryBarrier('before-infer')
}

export async function iosPrepareForMicCapture(): Promise<void> {
  releaseDecodeContext()
  iosTrackResource('decode-ctx', false)
  await iosMemoryBarrier('before-mic')
}

export async function iosPrepareAfterMicStop(): Promise<void> {
  iosTrackResource('mic-analyser', false)
  await iosMemoryBarrier('mic-stopped')
}

export async function iosPrepareBeforeTranscribe(): Promise<void> {
  releaseDecodeContext()
  iosTrackResource('decode-ctx', false)
  await iosMemoryBarrier('before-transcribe')
}

export async function iosPrepareForTts(): Promise<void> {
  if (!isIos()) return
  if (iosHasActiveResource('whisper-infer', 'decode-ctx')) {
    await iosMemoryBarrier('before-tts-after-stt')
  } else {
    await iosMemoryBarrier('before-tts', { light: true })
  }
}

export function iosMarkDecodeContextActive(): void {
  iosTrackResource('decode-ctx', true)
}

export function iosMarkMicAnalyserActive(): void {
  iosTrackResource('mic-analyser', true)
}

export function iosMarkWhisperModelActive(): void {
  iosTrackResource('whisper-model', true)
}

export function iosMarkWhisperModelInactive(): void {
  iosTrackResource('whisper-model', false)
}

export function iosMarkWhisperInferActive(): void {
  iosTrackResource('whisper-infer', true)
}

export function iosMarkWhisperInferInactive(): void {
  iosTrackResource('whisper-infer', false)
}

/** iOS cannot safely use whisper-small in-browser (tab reload). */
export function effectiveWhisperTierForPlatform(
  tier: 'tiny' | 'small',
): 'tiny' | 'small' {
  if (isIos() && tier === 'small') return 'tiny'
  return tier
}
