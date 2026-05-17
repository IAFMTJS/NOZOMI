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

/** Orb visuals follow speech lifecycle first, then conversation orb (e.g. TTS). */
export function derivePresenceOrbState(
  speechState: SpeechState,
  orbState: OrbState,
): OrbState {
  if (speechState === 'permission_pending' || speechState === 'listening') {
    return 'listening'
  }
  if (speechState === 'processing') return 'thinking'
  if (speechState === 'speaking' || orbState === 'speaking') return 'speaking'
  if (orbState === 'thinking') return 'thinking'
  return orbState === 'listening' ? 'listening' : 'idle'
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
