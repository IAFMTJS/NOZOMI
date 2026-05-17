import { markMicPrimed } from '@/systems/speech/speechCapabilities'
import { voiceDebug, voiceDebugWarn } from '@/systems/speech/voiceDebug'

const GESTURE_TTL_MS = 12_000

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
}

let heldStream: MediaStream | null = null
let pendingOpen: Promise<MediaStream | null> | null = null
let gestureOpenedAt = 0

/**
 * Start opening the mic in the same turn as a tap (required on iOS Safari).
 * Safe to call multiple times; reuses an active stream.
 */
export function startMicCaptureFromGesture(): void {
  if (!navigator.mediaDevices?.getUserMedia) return
  if (heldStream?.active) {
    gestureOpenedAt = Date.now()
    return
  }
  if (pendingOpen) return

  gestureOpenedAt = Date.now()
  voiceDebug('mic:gesture-start')

  pendingOpen = navigator.mediaDevices
    .getUserMedia(AUDIO_CONSTRAINTS)
    .then((stream) => {
      heldStream?.getTracks().forEach((t) => t.stop())
      heldStream = stream
      markMicPrimed()
      voiceDebug('mic:gesture-ready', { tracks: stream.getAudioTracks().length })
      return stream
    })
    .catch((err) => {
      voiceDebugWarn('mic:gesture-failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      return null
    })
    .finally(() => {
      pendingOpen = null
    })
}

/** Mic stream opened during a recent gesture, for the listen session to adopt. */
export async function consumeGestureMicStream(): Promise<MediaStream | null> {
  if (heldStream?.active && Date.now() - gestureOpenedAt < GESTURE_TTL_MS) {
    const stream = heldStream
    heldStream = null
    return stream
  }
  if (pendingOpen) {
    const stream = await pendingOpen
    if (stream?.active && Date.now() - gestureOpenedAt < GESTURE_TTL_MS) {
      heldStream = null
      return stream
    }
  }
  return null
}

export function releaseGestureMicStream(): void {
  heldStream?.getTracks().forEach((t) => t.stop())
  heldStream = null
  pendingOpen = null
}

export function hasActiveGestureMic(): boolean {
  return !!heldStream?.active
}
