import { voiceDebug, voiceDebugError } from '@/systems/speech/voiceDebug'

type RecorderCallbacks = {
  onReady?: () => void
  onLevel?: (level: number) => void
  onError?: (message: string) => void
}

let stream: MediaStream | null = null
let recorder: MediaRecorder | null = null
let chunks: Blob[] = []
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
  const data = new Uint8Array(128)
  const tick = () => {
    if (!levelAnalyser) return
    levelAnalyser.getByteFrequencyData(data)
    const avg = data.reduce((a, b) => a + b, 0) / data.length
    onLevel(Math.min(1, avg / 96))
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
  stopLevelLoop()
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  recorder = null

  if (!navigator.mediaDevices?.getUserMedia) {
    callbacks.onError?.('Microphone not available in this browser')
    return false
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })
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

    recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
    recorder.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data)
    }
    recorder.onerror = () => {
      voiceDebugError('rec:error', { generation })
      callbacks.onError?.('Recording failed')
    }
    recorder.start(250)
    voiceDebug('rec:start', { generation, mime: recorder.mimeType })
    if (callbacks.onLevel) startLevelLoop(stream, callbacks.onLevel)
    callbacks.onReady?.()
    return true
  } catch (err) {
    voiceDebugError('rec:start-failed', {
      generation,
      error: err instanceof Error ? err.message : String(err),
    })
    callbacks.onError?.('Microphone permission denied or unavailable')
    return false
  }
}

export function stopMicSession(): Promise<Blob | null> {
  const gen = sessionGen
  stopLevelLoop()

  return new Promise((resolve) => {
    const finish = (blob: Blob | null) => {
      stream?.getTracks().forEach((t) => t.stop())
      stream = null
      recorder = null
      chunks = []
      resolve(blob)
    }

    if (!recorder || recorder.state === 'inactive') {
      const blob =
        chunks.length > 0
          ? new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' })
          : null
      voiceDebug('rec:stop-empty', { generation: gen, hadChunks: chunks.length })
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
      recorder.stop()
    } catch {
      finish(null)
    }
  })
}

export function cancelMicSession(): void {
  sessionGen++
  stopLevelLoop()
  try {
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  } catch {
    /* ignore */
  }
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  recorder = null
  chunks = []
}
