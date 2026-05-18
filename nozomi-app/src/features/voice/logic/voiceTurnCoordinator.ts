import { resetOrbAudioLevel } from '@/features/orb/logic/orbAudioLevel'
import { clearTranscriptFinalizing } from '@/features/voice/logic/speechPresenceSync'
import { isAnyTtsOutputActive } from '@/features/voice/logic/ttsOutputState'
import {
  resetVoicePipelineStep,
  setVoicePipelineStep,
  type VoicePipelineStep,
} from '@/features/voice/logic/voicePipelineStep'
import { voiceDebugWarn } from '@/features/voice/logic/voiceDebug'
import { useUiStore } from '@/store/useUiStore'
import type { OrbState, SpeechState } from '@/types/domain'

export type VoiceTurnPhase =
  | 'idle'
  | 'arming'
  | 'capturing'
  | 'finalizing'
  | 'understanding'
  | 'speaking'
  | 'error'

/** Map granular pipeline + speech state to a single turn phase (debug + recovery). */
export function deriveVoiceTurnPhase(): VoiceTurnPhase {
  const ui = useUiStore.getState()
  if (ui.speechState === 'error') return 'error'
  if (ui.transcriptFinalizing) return 'finalizing'
  if (ui.speechState === 'permission_pending') return 'arming'
  if (ui.speechState === 'listening') return 'capturing'
  if (ui.speechState === 'speaking' || ui.orbState === 'speaking') return 'speaking'
  if (ui.speechState === 'processing') {
    const step = ui.voicePipelineStep
    if (step === 'generating' || step === 'understanding') return 'understanding'
    if (step === 'transcribing' || step === 'stopping-recorder') return 'finalizing'
    return 'understanding'
  }
  if (isAnyTtsOutputActive()) return 'speaking'
  return 'idle'
}

function setPresence(speech: SpeechState, orb: OrbState, step?: VoicePipelineStep): void {
  const ui = useUiStore.getState()
  ui.setSpeechState(speech)
  ui.setOrbState(orb)
  if (step !== undefined) setVoicePipelineStep(step)
}

/** Hard reset when UI drifted from the listen session (orphan processing / finalize flags). */
export function forceRecoverVoiceUi(reason: string): void {
  voiceDebugWarn('voice:force-recover', { reason, phase: deriveVoiceTurnPhase() })
  clearTranscriptFinalizing()
  resetVoicePipelineStep()
  resetOrbAudioLevel()
  const ui = useUiStore.getState()
  ui.setAudioLevel(0)
  ui.setSpeechState('idle')
  if (!isAnyTtsOutputActive() && ui.orbState !== 'speaking') {
    ui.setOrbState('idle')
  }
}

/** After a turn completes (success, timeout, or cancel) — safe to open the mic again. */
export function syncIdleAfterVoiceTurn(options?: { clearTranscriptDelayMs?: number }): void {
  const ui = useUiStore.getState()
  ui.setSpeechState('idle')
  clearTranscriptFinalizing()
  resetVoicePipelineStep()
  if (!isAnyTtsOutputActive() && ui.orbState !== 'speaking') {
    ui.setOrbState('idle')
  }
  const delay = options?.clearTranscriptDelayMs ?? 400
  window.setTimeout(() => {
    if (useUiStore.getState().speechState === 'idle') {
      useUiStore.getState().setLiveTranscript('')
    }
  }, delay)
}

export function enterVoiceListenPrepare(): void {
  setPresence('permission_pending', 'listening', 'preparing')
  clearTranscriptFinalizing()
}

export function enterVoiceCapturing(): void {
  setPresence('listening', 'listening', 'listening')
  clearTranscriptFinalizing()
}

export function enterVoiceFinalizing(): void {
  setPresence('processing', 'thinking', 'stopping-recorder')
  useUiStore.getState().setTranscriptFinalizing(true)
}

export function enterVoiceUnderstanding(): void {
  setPresence('processing', 'thinking', 'understanding')
  useUiStore.getState().setTranscriptFinalizing(false)
}

export function enterVoiceGenerating(): void {
  setPresence('processing', 'thinking', 'generating')
}

export function enterVoiceError(): void {
  setPresence('error', 'idle', 'error')
  clearTranscriptFinalizing()
}
