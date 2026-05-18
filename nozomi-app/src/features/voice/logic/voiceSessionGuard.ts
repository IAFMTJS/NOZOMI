import { useUiStore } from '@/store/useUiStore'
import { isListenSessionActive } from '@/systems/speech/listenStore'

/** True while mic, STT, or post-record finalize is in flight — defer SW reload / pipeline release. */
export function isVoiceSessionBusy(): boolean {
  const ui = useUiStore.getState()
  if (ui.transcriptFinalizing) return true
  if (isListenSessionActive()) return true
  const step = ui.voicePipelineStep
  if (
    step === 'preparing' ||
    step === 'listening' ||
    step === 'recording' ||
    step === 'stopping-recorder' ||
    step === 'transcribing'
  ) {
    return true
  }
  return (
    ui.speechState === 'listening' ||
    ui.speechState === 'permission_pending' ||
    ui.speechState === 'processing'
  )
}
