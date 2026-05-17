import { derivePresenceOrbState } from '@/features/voice/logic/listenPresence'
import { useUiStore } from '@/store/useUiStore'
import type { OrbState } from '@/types/domain'

/** Orb color/motion that matches mic + STT lifecycle (not stale store orb). */
export function usePresenceOrbState(): OrbState {
  const speechState = useUiStore((s) => s.speechState)
  const orbState = useUiStore((s) => s.orbState)
  return derivePresenceOrbState(speechState, orbState)
}
