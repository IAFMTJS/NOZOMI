import { orbStateForVoiceSessionPhase } from '@/features/voice/logic/voiceSessionFsm'
import { useUiStore } from '@/store/useUiStore'
import type { OrbState, SpeechState } from '@/types/domain'

/** UI phase for listen screen copy and transcript chrome. */
export type ListenPhase =
  | 'idle'
  | 'preparing'
  | 'capturing'
  | 'finalizing'
  | 'processing'
  | 'speaking'
  | 'error'

export function deriveListenPhase(
  speechState: SpeechState,
  orbState: OrbState,
  transcriptFinalizing = false,
): ListenPhase {
  if (speechState === 'error') return 'error'
  if (speechState === 'permission_pending') return 'preparing'
  if (speechState === 'listening') return 'capturing'
  if (transcriptFinalizing && speechState === 'processing') return 'finalizing'
  if (speechState === 'processing') return 'processing'
  if (speechState === 'speaking' || orbState === 'speaking') return 'speaking'
  return 'idle'
}

/** Orb visuals follow the voice session FSM (legacy args kept for tests). */
export function derivePresenceOrbState(
  _speechState?: SpeechState,
  _orbState?: OrbState,
): OrbState {
  return orbStateForVoiceSessionPhase(useUiStore.getState().voiceSessionPhase)
}

export function isListenCapturing(speechState: SpeechState): boolean {
  return speechState === 'listening' || speechState === 'permission_pending'
}

export function isPresenceBusy(
  speechState: SpeechState,
  transcriptFinalizing: boolean,
): boolean {
  return (
    speechState === 'processing' ||
    speechState === 'permission_pending' ||
    transcriptFinalizing
  )
}
