import { levelFromRms, rmsFromTimeDomain } from '@/systems/speech/audioLevel'
import { voiceDebug, voiceDebugError } from '@/systems/speech/voiceDebug'

type RecorderCallbacks = {
  onReady?: () => void
  onLevel?: (level: number) => void
  onError?: (err: unknown) => void
}

const MIC_OPEN_RETRIES = 3
const MIC_RETRY_DELAY_MS = 180

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

function stopLevelLoop(): void {
  cancelAnimationFrame(levelRaf)
  levelRaf = 0
  levelAnalyser = null
  void audioCtx?.close()
  audioCtx = null
}

function startLevelLoop(s: MediaStream, onLevel: (n: number) => void): void {
  stopLevelLoop()
  const data = new Uint8Array(256)
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
      analyser.fftSize = 256
      source.connect(analyser)
      levelAnalyser = analyser
      tick()
    } catch {
      onLevel(0)
    }
  })()
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
  stopLevelLoop()
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  recorder = null
  recorderMime = ''

  if (!navigator.mediaDevices?.getUserMedia) {
    callbacks.onError?.(new Error('Microphone not available in this browser'))
    return false
  }

  try {
    stream = await openMicStream()
    if (sessionGen !== generation) {
      stream.getTracks().forEach((t) => t.stop())
      stream = null
      return false
    }

    const mime =
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''

    recorderMime = mime
    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data)
    }
    recorder.onerror = () => {
      voiceDebugError('rec:error', { generation })
      callbacks.onError?.(new Error('Recording failed'))
    }
    voiceDebug('rec:mic-open', { generation, mime: recorder.mimeType })
    if (callbacks.onLevel) startLevelLoop(stream, callbacks.onLevel)
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
    recorder.start(250)
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
  const gen = sessionGen
  stopLevelLoop()

  return new Promise((resolve) => {
    const finish = (blob: Blob | null) => {
      recordingActive = false
      stream?.getTracks().forEach((t) => t.stop())
      stream = null
      recorder = null
      recorderMime = ''
      chunks = []
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

    if (recorder.state === 'inactive') {
      const blob =
        chunks.length > 0
          ? new Blob(chunks, { type: recorder?.mimeType || chunks[0]?.type || 'audio/webm' })
          : null
      voiceDebug('rec:stop', {
        generation: gen,
        bytes: blob?.size ?? 0,
        chunks: chunks.length,
      })
      finish(blob)
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
      finish(blob)
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
      finish(null)
    }
  })
}

export function cancelMicSession(): void {
  sessionGen++
  recordingActive = false
  stopLevelLoop()
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
