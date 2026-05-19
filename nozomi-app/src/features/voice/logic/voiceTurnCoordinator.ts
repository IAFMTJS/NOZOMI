import { clearTranscriptFinalizing } from '@/features/voice/logic/speechPresenceSync'
import { isAnyTtsOutputActive } from '@/features/voice/logic/ttsOutputState'
import { setVoicePipelineStep } from '@/features/voice/logic/voicePipelineStep'
import { voiceDebugWarn } from '@/features/voice/logic/voiceDebug'
import {
  getVoiceSessionPhase,
  resetVoiceSessionFsm,
  transitionVoiceSession,
  type VoiceSessionPhase,
} from '@/features/voice/logic/voiceSessionFsm'
import { useUiStore } from '@/store/useUiStore'

export type VoiceTurnPhase =
  | 'idle'
  | 'arming'
  | 'capturing'
  | 'finalizing'
  | 'understanding'
  | 'speaking'
  | 'error'

/** Map FSM phase to legacy turn phase (debug + recovery). */
export function deriveVoiceTurnPhase(): VoiceTurnPhase {
  const phase = getVoiceSessionPhase()
  const ui = useUiStore.getState()
  if (phase === 'error') return 'error'
  if (phase === 'transcribing' || ui.transcriptFinalizing) return 'finalizing'
  if (
    phase === 'requesting_permission' ||
    phase === 'initializing_audio' ||
    phase === 'retrying'
  ) {
    return 'arming'
  }
  if (phase === 'listening') return 'capturing'
  if (phase === 'responding' || isAnyTtsOutputActive()) return 'speaking'
  if (phase === 'thinking') return 'understanding'
  return 'idle'
}

/** Hard reset when UI drifted from the listen session. */
export function forceRecoverVoiceUi(reason: string): void {
  voiceDebugWarn('voice:force-recover', { reason, phase: getVoiceSessionPhase() })
  resetVoiceSessionFsm(reason)
}

/** After a turn completes — safe to open the mic again. */
export function syncIdleAfterVoiceTurn(options?: { clearTranscriptDelayMs?: number }): void {
  if (isAnyTtsOutputActive()) {
    transitionVoiceSession('responding', 'turn-complete-tts-active', { force: true })
  } else {
    transitionVoiceSession('idle', 'turn-complete', { force: true })
  }
  const delay = options?.clearTranscriptDelayMs ?? 400
  window.setTimeout(() => {
    if (getVoiceSessionPhase() === 'idle') {
      useUiStore.getState().setLiveTranscript('')
    }
  }, delay)
}

const COORD_FORCE = { force: true as const }

export function enterVoiceListenPrepare(): void {
  transitionVoiceSession('requesting_permission', 'listen-prepare', COORD_FORCE)
  clearTranscriptFinalizing()
}

export function enterVoiceInitializingAudio(): void {
  transitionVoiceSession('initializing_audio', 'mic-granted', COORD_FORCE)
}

export function enterVoiceCapturing(): void {
  transitionVoiceSession('listening', 'mic-capturing', COORD_FORCE)
  clearTranscriptFinalizing()
}

export function enterVoiceFinalizing(): void {
  transitionVoiceSession('transcribing', 'stop-tap-finalize', COORD_FORCE)
}

export function enterVoiceUnderstanding(): void {
  transitionVoiceSession('thinking', 'engine-understanding', COORD_FORCE)
  setVoicePipelineStep('understanding')
}

export function enterVoiceGenerating(): void {
  transitionVoiceSession('thinking', 'engine-generating', COORD_FORCE)
  setVoicePipelineStep('generating')
}

export function enterVoiceResponding(): void {
  transitionVoiceSession('responding', 'tts-start', COORD_FORCE)
}

export function enterVoiceError(): void {
  transitionVoiceSession('error', 'stt-or-mic-error', COORD_FORCE)
}

export function enterVoiceRetrying(): void {
  transitionVoiceSession('retrying', 'user-retry', COORD_FORCE)
}

export function enterVoiceInterrupted(): void {
  transitionVoiceSession('interrupted', 'barge-in', COORD_FORCE)
}

export function voiceSessionPhaseFromLegacy(
  speechState: string,
  pipelineStep: string,
  transcriptFinalizing: boolean,
): VoiceSessionPhase | null {
  if (speechState === 'error') return 'error'
  if (transcriptFinalizing) return 'transcribing'
  if (speechState === 'permission_pending') {
    return pipelineStep === 'preparing' ? 'initializing_audio' : 'requesting_permission'
  }
  if (speechState === 'listening') return 'listening'
  if (speechState === 'speaking') return 'responding'
  if (speechState === 'processing') {
    if (pipelineStep === 'transcribing' || pipelineStep === 'stopping-recorder') {
      return 'transcribing'
    }
    if (pipelineStep === 'generating') return 'thinking'
    return 'thinking'
  }
  if (speechState === 'idle') return 'idle'
  return null
}
