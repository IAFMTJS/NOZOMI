import { levelFromRms, rmsFromTimeDomain } from '@/systems/speech/audioLevel'
import { consumeGestureMicStream } from '@/systems/speech/micGesture'
import { voiceDebug, voiceDebugError, voiceDebugWarn } from '@/systems/speech/voiceDebug'
import { isIos } from '@/utils/device'

type RecorderCallbacks = {
  onReady?: () => void
  onLevel?: (level: number) => void
  onError?: (err: unknown) => void
}

const MIC_OPEN_RETRIES = 3
const MIC_RETRY_DELAY_MS = 180

function pickRecorderMime(): string {
  const candidates = isIos()
    ? ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm']
    : [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
      ]
  for (const mime of candidates) {
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
    stream = (await consumeGestureMicStream()) ?? (await openMicStream())
    if (sessionGen !== generation) {
      stream.getTracks().forEach((t) => t.stop())
      stream = null
      return false
    }

    const mime = pickRecorderMime()

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
  stopLevelLoop()

  stopInFlight = new Promise((resolve) => {
    const finish = (blob: Blob | null) => {
      recordingActive = false
      stream?.getTracks().forEach((t) => t.stop())
      stream = null
      recorder = null
      recorderMime = ''
      chunks = []
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
