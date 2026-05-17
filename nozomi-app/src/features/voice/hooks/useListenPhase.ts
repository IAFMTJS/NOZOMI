import { deriveListenPhase } from '@/features/voice/logic/listenPresence'
import { useUiStore } from '@/store/useUiStore'
import type { ListenPhase } from '@/features/voice/logic/listenPresence'

export function useListenPhase(): ListenPhase {
  const speechState = useUiStore((s) => s.speechState)
  const orbState = useUiStore((s) => s.orbState)
  const transcriptFinalizing = useUiStore((s) => s.transcriptFinalizing)
  return deriveListenPhase(speechState, orbState, transcriptFinalizing)
}
