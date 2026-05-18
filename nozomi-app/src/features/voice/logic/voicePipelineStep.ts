import { useUiStore } from '@/store/useUiStore'
import { voiceDebug } from '@/features/voice/logic/voiceDebug'

/** Fine-grained voice pipeline step for UI + debug (survives listen phase gaps). */
export type VoicePipelineStep =
  | 'idle'
  | 'preparing'
  | 'listening'
  | 'recording'
  | 'stopping-recorder'
  | 'transcribing'
  | 'understanding'
  | 'generating'
  | 'speaking'
  | 'error'

export function setVoicePipelineStep(step: VoicePipelineStep): void {
  const prev = useUiStore.getState().voicePipelineStep
  if (prev === step) return
  useUiStore.getState().setVoicePipelineStep(step)
  voiceDebug('pipeline', { step, prev })
}

export function resetVoicePipelineStep(): void {
  setVoicePipelineStep('idle')
}
