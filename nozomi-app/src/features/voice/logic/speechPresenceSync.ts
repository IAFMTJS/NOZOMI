import { enterVoiceResponding } from '@/features/voice/logic/voiceTurnCoordinator'
import { resetVoiceSessionFsm } from '@/features/voice/logic/voiceSessionFsm'
import { getVoiceSessionPhase } from '@/features/voice/logic/voiceSessionFsm'
import { useUiStore } from '@/store/useUiStore'

/** Keep status row + orb aligned when browser TTS starts or stops. */
export function syncSpeechOutputPresence(active: boolean): void {
  if (active) {
    enterVoiceResponding()
    return
  }
  if (getVoiceSessionPhase() === 'responding') {
    resetVoiceSessionFsm('tts-ended')
  }
}

export function clearTranscriptFinalizing(): void {
  useUiStore.getState().setTranscriptFinalizing(false)
}
