import { levelFromRms, rmsFromTimeDomain } from '@/features/voice/logic/audioLevel'
import { consumeGestureMicStream } from '@/features/voice/logic/micGesture'
import {
  clearSharedMicStreamIf,
  getSharedMicStream,
} from '@/features/voice/logic/speechCapabilities'
import {
  getWarmedRecorderMime,
  recorderMimeCandidates,
} from '@/features/voice/logic/micRecorderWarmup'
import { voiceDebug, voiceDebugError, voiceDebugWarn } from '@/features/voice/logic/voiceDebug'
import { isIos, isMobileDevice } from '@/utils/device'

type RecorderCallbacks = {
  onReady?: () => void
  onLevel?: (level: number) => void
  /** Fired when encoded chunks show energy (mobile — no analyser AudioContext). */
  onSoundChunk?: () => void
  onError?: (err: unknown) => void
}

const MOBILE_SOUND_CHUNK_BYTES = 400

const MIC_OPEN_RETRIES = 3
const MIC_RETRY_DELAY_MS = 180

function pickRecorderMime(): string {
  const prewarmed = getWarmedRecorderMime()
  if (prewarmed !== null) return prewarmed
  for (const mime of recorderMimeCandidates()) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''
}

async function openMicStream(): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  }
  let lastErr: unknown
  for (let attempt = 0; attempt < MIC_OPEN_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, MIC_RETRY_DELAY_MS * attempt))
    }
    try {
      return await navigator.mediaDevices.getUserMedia(constraints)
    } catch (err) {
      lastErr = err
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'NotFoundError') {
        throw err
      }
    }
  }
  throw lastErr ?? new Error('Microphone unavailable')
}

let stream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let recorderMime = ''
let chunks: Blob[] = []
let recordingActive = false
let levelRaf = 0
let audioCtx: AudioContext | null = null
let levelAnalyser: AnalyserNode | null = null
let sessionGen = 0
let stopInFlight: Promise<Blob | null> | null = null
async function stopLevelLoop(): Promise<void> {
  cancelAnimationFrame(levelRaf)
  levelRaf = 0
  levelAnalyser = null
  const ctx = audioCtx
  audioCtx = null
  if (!ctx || ctx.state === 'closed') return
  try {
    await ctx.close()
  } catch {
    /* ignore */
  }
}

function startLevelLoop(s: MediaStream, onLevel: (n: number) => void): void {
  void stopLevelLoop().then(() => {
    const data = new Uint8Array(isIos() ? 128 : 256)
    const tick = () => {
      if (!levelAnalyser) return
      levelAnalyser.getByteTimeDomainData(data)
      onLevel(levelFromRms(rmsFromTimeDomain(data)))
      levelRaf = requestAnimationFrame(tick)
    }
    void (async () => {
      try {
        audioCtx = new AudioContext()
        if (audioCtx.state === 'suspended') await audioCtx.resume()
        const source = audioCtx.createMediaStreamSource(s)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = isIos() ? 128 : 256
        source.connect(analyser)
        levelAnalyser = analyser
        tick()
      } catch {
        onLevel(0)
      }
    })()
  })
}

export function isMicRecorderActive(): boolean {
  return !!recorder && recorder.state === 'recording'
}

export async function startMicSession(
  generation: number,
  callbacks: RecorderCallbacks = {},
): Promise<boolean> {
  sessionGen = generation
  chunks = []
  recordingActive = false
  void stopLevelLoop()
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  recorder = null
  recorderMime = ''

  if (!navigator.mediaDevices?.getUserMedia) {
    callbacks.onError?.(new Error('Microphone not available in this browser'))
    return false
  }

  try {
    const shared = getSharedMicStream()
    stream =
      (await consumeGestureMicStream()) ??
      (shared?.active ? shared : null) ??
      (await openMicStream())
    if (shared && stream === shared) {
      clearSharedMicStreamIf(shared)
    }
    if (sessionGen !== generation) {
      stream.getTracks().forEach((t) => t.stop())
      stream = null
      return false
    }

    const mime = pickRecorderMime()

    recorderMime = mime
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) {
        chunks.push(ev.data)
        if (isMobileDevice() && ev.data.size >= MOBILE_SOUND_CHUNK_BYTES) {
          callbacks.onSoundChunk?.()
        }
      }
    }
    recorder.onerror = () => {
      voiceDebugError('rec:error', { generation })
      callbacks.onError?.(new Error('Recording failed'))
    }
    voiceDebug('rec:mic-open', { generation, mime: recorder.mimeType })
    if (callbacks.onLevel && !isMobileDevice()) {
      startLevelLoop(stream, callbacks.onLevel)
    }
    callbacks.onReady?.()
    return true
  } catch (err) {
    voiceDebugError('rec:start-failed', {
      generation,
      error: err instanceof Error ? err.message : String(err),
    })
    callbacks.onError?.(err)
    return false
  }
}

/** Start capturing audio (call when STT + mic are both ready — avoids silent pre-roll). */
export function beginMicRecording(generation: number): boolean {
  if (sessionGen !== generation || !recorder || recordingActive) return false
  if (recorder.state !== 'inactive') return false
  chunks = []
  try {
    recorder.start(isIos() ? 400 : 250)
    recordingActive = true
    voiceDebug('rec:start', { generation, mime: recorder.mimeType || recorderMime })
    return true
  } catch (err) {
    voiceDebugError('rec:start-failed', {
      generation,
      error: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

export function stopMicSession(): Promise<Blob | null> {
  if (stopInFlight) {
    voiceDebug('rec:stop-coalesced')
    return stopInFlight
  }
  const gen = sessionGen

  void stopLevelLoop()

  stopInFlight = new Promise((resolve) => {
    const finish = async (blob: Blob | null) => {
      recordingActive = false
      stream?.getTracks().forEach((t) => t.stop())
      stream = null
      recorder = null
      recorderMime = ''
      chunks = []
      await stopLevelLoop()
      stopInFlight = null
      resolve(blob)
    }

    if (!recorder || (!recordingActive && recorder.state === 'inactive')) {
      const blob =
        chunks.length > 0
          ? new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' })
          : null
      voiceDebug('rec:stop-empty', {
        generation: gen,
        hadChunks: chunks.length,
        recordingActive,
      })
      finish(blob)
      return
    }

    let stopTimeout = 0
    let settled = false
    const wrappedFinish = (blob: Blob | null) => {
      if (settled) return
      settled = true
      clearTimeout(stopTimeout)
      finish(blob)
    }
    stopTimeout = window.setTimeout(() => {
      voiceDebugWarn('rec:stop-timeout', { generation: gen })
      wrappedFinish(
        chunks.length > 0
          ? new Blob(chunks, { type: recorder?.mimeType || chunks[0]?.type || 'audio/webm' })
          : null,
      )
    }, isIos() ? 2500 : 1500)

    if (recorder.state === 'inactive') {
      const blob =
        chunks.length > 0
          ? new Blob(chunks, { type: recorder?.mimeType || chunks[0]?.type || 'audio/webm' })
          : null
      voiceDebug('rec:stop-inactive', {
        generation: gen,
        bytes: blob?.size ?? 0,
        chunks: chunks.length,
      })
      wrappedFinish(blob)
      return
    }

    recorder.onstop = () => {
      const blob =
        chunks.length > 0
          ? new Blob(chunks, { type: recorder?.mimeType || chunks[0]?.type || 'audio/webm' })
          : null
      voiceDebug('rec:stop', {
        generation: gen,
        bytes: blob?.size ?? 0,
        chunks: chunks.length,
      })
      wrappedFinish(blob)
    }

    try {
      if (recorder.state === 'recording') {
        try {
          recorder.requestData()
        } catch {
          /* ignore */
        }
      }
      recorder.stop()
    } catch {
      wrappedFinish(null)
    }
  })
  return stopInFlight
}

export function cancelMicSession(): void {
  stopInFlight = null
  sessionGen++
  recordingActive = false
  void stopLevelLoop()
  try {
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  } catch {
    /* ignore */
  }
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  recorder = null
  recorderMime = ''
  chunks = []
}
