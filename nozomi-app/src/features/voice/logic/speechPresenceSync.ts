import { useUiStore } from '@/store/useUiStore'

/** Keep status row + orb aligned when browser TTS starts or stops. */
export function syncSpeechOutputPresence(active: boolean): void {
  const ui = useUiStore.getState()
  if (active) {
    ui.setSpeechState('speaking')
    ui.setOrbState('speaking')
    return
  }
  if (ui.speechState === 'speaking') {
    ui.setSpeechState('idle')
  }
  if (ui.orbState === 'speaking') {
    ui.setOrbState('idle')
  }
}

export function clearTranscriptFinalizing(): void {
  useUiStore.getState().setTranscriptFinalizing(false)
}
