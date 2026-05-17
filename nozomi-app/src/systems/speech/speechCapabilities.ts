import {
  consumeGestureMicStream,
  releaseGestureMicStream,
  startMicCaptureFromGesture,
} from '@/systems/speech/micGesture'
import type { SpeechError } from '@/systems/speech/types'

let sharedMicStream: MediaStream | null = null
let micAcquirePromise: Promise<MediaStream | null> | null = null
let micPrimedAt = 0

const MIC_PRIME_TTL_MS = 45_000

export function markMicPrimed(): void {
  micPrimedAt = Date.now()
}

export function isMicRecentlyPrimed(): boolean {
  return Date.now() - micPrimedAt < MIC_PRIME_TTL_MS
}

export function micNeedsSecureContext(): boolean {
  return typeof window !== 'undefined' && !window.isSecureContext
}

export function speechSupported(): {
  stt: boolean
  tts: boolean
  needsHttps: boolean
} {
  const w = window as Window & {
    SpeechRecognition?: typeof SpeechRecognition
    webkitSpeechRecognition?: typeof SpeechRecognition
  }
  const browserStt = Boolean(w.SpeechRecognition ?? w.webkitSpeechRecognition)
  const localStt =
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  const canStt = browserStt || localStt
  return {
    stt: canStt,
    tts: 'speechSynthesis' in window,
    needsHttps: canStt && micNeedsSecureContext(),
  }
}

export function micErrorFromUnknown(err: unknown): SpeechError {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return { code: 'not-allowed', message: 'Microphone permission denied' }
      case 'NotFoundError':
        return { code: 'no-device', message: 'No microphone device found' }
      case 'NotReadableError':
      case 'AbortError':
        return {
          code: 'busy',
          message: 'Microphone is in use by another app or could not be opened',
        }
      default:
        break
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return { code: 'unknown', message: err.message }
  }
  return { code: 'unknown', message: 'Microphone could not be opened' }
}

export function mapSpeechRecognitionError(code: string): SpeechError {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return {
        code: 'not-allowed',
        message: 'Microphone permission denied for speech recognition',
      }
    case 'network':
      return {
        code: 'network',
        message: 'Speech recognition needs an internet connection (Chrome/Edge)',
      }
    case 'audio-capture':
      return {
        code: 'no-device',
        message: 'Microphone is in use by another app or could not be opened',
      }
    case 'aborted':
      return { code: 'busy', message: 'Speech recognition was interrupted' }
    case 'language-not-supported':
      return {
        code: 'not-supported',
        message:
          'Browser speech recognition language does not match your system language — switch to On-device in Settings',
      }
    default:
      return { code: 'unknown', message: `Recognition failed (${code})` }
  }
}

export async function primeMicrophonePermission(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return false
  startMicCaptureFromGesture()
  try {
    const stream = await consumeGestureMicStream()
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      releaseGestureMicStream()
      sharedMicStream = null
      markMicPrimed()
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const fallback = await navigator.mediaDevices.getUserMedia({ audio: true })
    fallback.getTracks().forEach((t) => t.stop())
    sharedMicStream = null
    markMicPrimed()
    return true
  } catch {
    return false
  }
}

/** @deprecated Use primeMicrophonePermission */
export async function prepareMicrophone(): Promise<boolean> {
  return primeMicrophonePermission()
}

export async function acquireSharedMicrophone(): Promise<MediaStream | null> {
  if (sharedMicStream?.active) return sharedMicStream
  if (!navigator.mediaDevices?.getUserMedia) return null
  const gestureStream = await consumeGestureMicStream()
  if (gestureStream) {
    sharedMicStream = gestureStream
    markMicPrimed()
    return gestureStream
  }
  if (!micAcquirePromise) {
    micAcquirePromise = navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        sharedMicStream = stream
        return stream
      })
      .catch(() => null)
      .finally(() => {
        micAcquirePromise = null
      })
  }
  return micAcquirePromise
}

export function releaseSharedMicrophone(): void {
  sharedMicStream?.getTracks().forEach((t) => t.stop())
  sharedMicStream = null
  releaseGestureMicStream()
}

export function getSharedMicStream(): MediaStream | null {
  return sharedMicStream
}

export function clearSharedMicStreamIf(stream: MediaStream): void {
  if (sharedMicStream === stream) sharedMicStream = null
}
