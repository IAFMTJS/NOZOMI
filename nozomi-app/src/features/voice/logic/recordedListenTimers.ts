import { resetVoicePipelineStep } from '@/features/voice/logic/voicePipelineStep'

let recordingCapTimer: number | null = null

export function clearRecordingCapTimer(): void {
  if (recordingCapTimer) {
    clearTimeout(recordingCapTimer)
    recordingCapTimer = null
  }
}

export function clearRecordedCaptureTimers(): void {
  clearRecordingCapTimer()
}

export function setRecordingCapTimer(timer: number): void {
  clearRecordingCapTimer()
  recordingCapTimer = timer
}

export function teardownRecordedListenTimers(): void {
  clearRecordedCaptureTimers()
  resetVoicePipelineStep()
}
