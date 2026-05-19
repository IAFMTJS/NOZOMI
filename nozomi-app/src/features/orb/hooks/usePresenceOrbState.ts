import { orbStateForVoiceSessionPhase } from '@/features/voice/logic/voiceSessionFsm'
import { isAnyTtsOutputActive } from '@/features/voice/logic/ttsOutputState'
import { useUiStore } from '@/store/useUiStore'
import type { OrbState } from '@/types/domain'

/** Orb visuals follow the central voice session FSM (not stale store fields). */
export function usePresenceOrbState(): OrbState {
  const phase = useUiStore((s) => s.voiceSessionPhase)
  if (phase === 'responding' || isAnyTtsOutputActive()) {
    return 'speaking'
  }
  return orbStateForVoiceSessionPhase(phase)
}
