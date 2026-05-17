import type { SpeechErrorCode } from '@/systems/speech/types'

export type SpeechListenApi = {
  armAndGoToListen: () => Promise<void>
  beginListening: () => boolean
  finishRecording: () => void
  cancelSession: () => void
  attachToActiveSession: () => boolean
  detachUi: () => void
  errorCode: SpeechErrorCode | undefined
  clearError: () => void
  offlineSttReady: boolean
}
