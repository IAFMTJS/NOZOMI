import {
  iosMarkDecodeContextActive,
  iosTrackResource,
} from '@/features/voice/logic/iosMemoryBudget'
import { getVoicePlatformTuning, isIos, isLowMemoryDevice } from '@/utils/device'

const TARGET_RATE = 16_000

let sharedDecodeCtx: AudioContext | null = null

async function getDecodeContext(): Promise<AudioContext> {
  if (!sharedDecodeCtx || sharedDecodeCtx.state === 'closed') {
    sharedDecodeCtx = new AudioContext()
    iosMarkDecodeContextActive()
  }
  if (sharedDecodeCtx.state === 'suspended') {
    await sharedDecodeCtx.resume()
  }
  return sharedDecodeCtx
}

function maxInferenceSamples(): number {
  const tuned = getVoicePlatformTuning().maxDecodeSamples16k
  if (tuned > 0) return tuned
  if (isLowMemoryDevice()) return 22 * TARGET_RATE
  return 30 * TARGET_RATE
}

/** Drop decode AudioContext before WASM infer (frees native decode buffers on iOS). */
export function releaseDecodeContext(): void {
  if (!sharedDecodeCtx) return
  try {
    if (sharedDecodeCtx.state !== 'closed') {
      void sharedDecodeCtx.close()
    }
  } catch {
    /* ignore */
  }
  sharedDecodeCtx = null
  iosTrackResource('decode-ctx', false)
}

/** RMS loudness of mono PCM in [0, ~1]. */
export function pcmRms(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]
    sum += s * s
  }
  return Math.sqrt(sum / samples.length)
}

/** Decode a recorded blob (webm/opus/mp4) to mono 16 kHz PCM for Whisper. */
export async function decodeRecordingTo16kMono(blob: Blob): Promise<Float32Array> {
  if (isIos()) {
    releaseDecodeContext()
  }
  const buffer = await blob.arrayBuffer()

  async function decodeOnce(freshContext: boolean): Promise<AudioBuffer> {
    if (freshContext) releaseDecodeContext()
    const ctx = await getDecodeContext()
    return ctx.decodeAudioData(buffer.slice(0))
  }

  let decoded: AudioBuffer
  try {
    decoded = await decodeOnce(isIos())
  } catch {
    // Recorder stop + shared AudioContext can race — retry on a fresh context.
    await new Promise((r) => setTimeout(r, isIos() ? 150 : 80))
    decoded = await decodeOnce(true)
  }
  const mono = downmixToMono(decoded)
  const atTarget =
    decoded.sampleRate === TARGET_RATE
      ? mono
      : await resampleToRate(mono, decoded.sampleRate, TARGET_RATE)
  const maxSamples = maxInferenceSamples()
  if (atTarget.length <= maxSamples) return atTarget
  return atTarget.slice(-maxSamples)
}

function downmixToMono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels < 2) {
    return buffer.getChannelData(0).slice()
  }
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)
  const scale = Math.sqrt(2) / 2
  const mono = new Float32Array(buffer.length)
  for (let i = 0; i < buffer.length; i++) {
    mono[i] = scale * (left[i] + right[i])
  }
  return mono
}

async function resampleToRate(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
): Promise<Float32Array> {
  const durationSec = samples.length / fromRate
  const offline = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(durationSec * toRate)),
    toRate,
  )
  const buf = offline.createBuffer(1, samples.length, fromRate)
  buf.copyToChannel(new Float32Array(samples), 0)
  const src = offline.createBufferSource()
  src.buffer = buf
  src.connect(offline.destination)
  src.start(0)
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0).slice()
}
