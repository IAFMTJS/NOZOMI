import { isIos } from '@/utils/device'
import { voiceDebug } from '@/features/voice/logic/voiceDebug'

/** MIME types we try when opening MediaRecorder (same order as micSessionRecorder). */
export function recorderMimeCandidates(): string[] {
  return isIos()
    ? ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']
}

let codecsWarmed = false
let warmedMime: string | null = null

/** Probe supported recorder MIME types (no mic open, negligible memory). */
export function warmMicRecorderCodecs(): string {
  if (codecsWarmed) return warmedMime ?? ''
  codecsWarmed = true
  if (typeof MediaRecorder === 'undefined') {
    warmedMime = ''
    return ''
  }
  for (const mime of recorderMimeCandidates()) {
    MediaRecorder.isTypeSupported(mime)
  }
  warmedMime = pickRecorderMimeFromCandidates()
  voiceDebug('mic:codecs-warmed', { mime: warmedMime || '(default)' })
  return warmedMime
}

function pickRecorderMimeFromCandidates(): string {
  for (const mime of recorderMimeCandidates()) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

/** Preferred MIME after warmMicRecorderCodecs(); null if not warmed yet. */
export function getWarmedRecorderMime(): string | null {
  return codecsWarmed ? warmedMime : null
}

/** Test helper */
export function resetMicRecorderWarmupForTests(): void {
  codecsWarmed = false
  warmedMime = null
}
