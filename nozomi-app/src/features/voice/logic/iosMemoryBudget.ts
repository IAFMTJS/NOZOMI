/**
 * Lightweight iOS helpers — heavy lifting is done in mobileVoiceBoot at app start.
 * During turns we only release decode buffers before WASM infer (no multi-second barriers).
 */
import { releaseDecodeContext } from '@/features/voice/logic/audioDecode'
import { useUiStore } from '@/store/useUiStore'
import { isIos } from '@/utils/device'
import type { OrbState, SpeechState } from '@/types/domain'

/** Static orb while decode/WASM/NLU are active (saves WebGL + animation RAM on iOS). */
export function isIosVoiceHeavyUi(orbState: OrbState, speechState: SpeechState): boolean {
  if (!isIos()) return false
  const step = useUiStore.getState().voicePipelineStep
  if (
    step === 'transcribing' ||
    step === 'stopping-recorder' ||
    step === 'understanding'
  ) {
    return true
  }
  return speechState === 'processing' || orbState === 'thinking'
}

/** Drop decode AudioContext before ONNX infer (main iOS OOM fix during a turn). */
export async function iosReleaseBeforeWhisperInfer(): Promise<void> {
  if (!isIos()) return
  releaseDecodeContext()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
  await new Promise((r) => setTimeout(r, 220))
}

/** iOS cannot safely use whisper-small in-browser (tab reload). */
export function effectiveWhisperTierForPlatform(
  tier: 'tiny' | 'small',
): 'tiny' | 'small' {
  if (isIos() && tier === 'small') return 'tiny'
  return tier
}

/** @deprecated No-op — use iosReleaseBeforeWhisperInfer. */
export const yieldForIosMemoryPressure = async (_phase: string): Promise<void> => {
  await iosReleaseBeforeWhisperInfer()
}

export const iosMemoryBarrier = yieldForIosMemoryPressure
export const iosPrepareForWhisperLoad = yieldForIosMemoryPressure
export const iosPrepareForAudioDecode = async (): Promise<void> => {
  if (isIos()) releaseDecodeContext()
}
export const iosPrepareForWhisperInfer = iosReleaseBeforeWhisperInfer
export const iosPrepareForMicCapture = async (): Promise<void> => undefined
export const iosPrepareAfterMicStop = async (): Promise<void> => undefined
export const iosPrepareBeforeTranscribe = async (): Promise<void> => {
  if (isIos()) releaseDecodeContext()
}
export const iosPrepareForTts = async (): Promise<void> => undefined

export function iosTrackResource(_resource: string, _on: boolean): void {
  /* no-op — kept for call-site compatibility */
}

export const iosMarkDecodeContextActive = (): void => undefined
export const iosMarkMicAnalyserActive = (): void => undefined
export const iosMarkWhisperModelActive = (): void => undefined
export const iosMarkWhisperModelInactive = (): void => undefined
export const iosMarkWhisperInferActive = (): void => undefined
export const iosMarkWhisperInferInactive = (): void => undefined

export function shouldSkipIdleWhisperPreload(): boolean {
  return false
}

export function iosHasActiveResource(): boolean {
  return false
}

export function iosActiveResources(): ReadonlySet<string> {
  return new Set()
}
