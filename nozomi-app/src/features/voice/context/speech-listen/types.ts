import type { SpeechErrorCode } from '@/features/voice/logic/types'

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
  /** 0–100 while Whisper weights load on /listen; null when not downloading. */
  offlineSttLoadPercent: number | null
}
