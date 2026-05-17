import { decodeRecordingTo16kMono } from '@/systems/speech/audioDecode'
import { voiceDebug, voiceDebugError, voiceDebugWarn } from '@/systems/speech/voiceDebug'

type WhisperLang = 'english' | 'japanese' | 'dutch'

const LANG_MAP: Record<string, WhisperLang> = {
  'en-US': 'english',
  'ja-JP': 'japanese',
  'nl-NL': 'dutch',
}

const MODEL_EN = 'Xenova/whisper-tiny.en'
const MODEL_MULTI = 'Xenova/whisper-tiny'

type Transcriber = (
  audio: Float32Array,
  options?: { language?: WhisperLang; task?: string },
) => Promise<{ text: string }>

let pipelinePromise: Promise<Transcriber> | null = null
let pipelineModelId: string | null = null
let lastOfflineSttError: string | null = null

function whisperLang(bcp47: string): WhisperLang {
  return LANG_MAP[bcp47] ?? 'english'
}

function modelForLang(bcp47: string): string {
  return bcp47 === 'en-US' ? MODEL_EN : MODEL_MULTI
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.stack ? `${err.name}: ${err.message}\n${err.stack}` : `${err.name}: ${err.message}`
  }
  return String(err)
}

async function configureTransformersEnv(): Promise<void> {
  const { env } = await import('@huggingface/transformers')
  env.allowLocalModels = false
  env.useBrowserCache = true
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1
  }
}

async function loadPipeline(bcp47: string): Promise<Transcriber> {
  const model = modelForLang(bcp47)
  if (pipelinePromise && pipelineModelId === model) {
    return pipelinePromise
  }

  pipelineModelId = model
  pipelinePromise = (async () => {
    voiceDebug('offline-stt:load-model', { model })
    await configureTransformersEnv()
    const { pipeline } = await import('@huggingface/transformers')
    return pipeline('automatic-speech-recognition', model) as Promise<Transcriber>
  })()

  try {
    return await pipelinePromise
  } catch (err) {
    pipelinePromise = null
    pipelineModelId = null
    throw err
  }
}

export function getLastOfflineSttError(): string | null {
  return lastOfflineSttError
}

export function preloadOfflineStt(lang = 'en-US'): void {
  void loadPipeline(lang).catch((err) => {
    lastOfflineSttError = formatError(err)
    voiceDebugError('offline-stt:preload-failed', { error: lastOfflineSttError })
    pipelinePromise = null
    pipelineModelId = null
  })
}

export async function transcribeAudioBlob(
  blob: Blob,
  bcp47: string,
): Promise<string> {
  if (!blob.size) return ''
  lastOfflineSttError = null
  voiceDebug('offline-stt:start', { bytes: blob.size, lang: bcp47 })

  try {
    const audio = await decodeRecordingTo16kMono(blob)
    voiceDebug('offline-stt:decoded', {
      samples: audio.length,
      durationSec: +(audio.length / 16_000).toFixed(2),
    })
    if (audio.length < 1600) {
      voiceDebugWarn('offline-stt:too-short', { samples: audio.length })
      return ''
    }

    const transcriber = await loadPipeline(bcp47)
    const out = await transcriber(audio, {
      language: whisperLang(bcp47),
      task: 'transcribe',
    })
    const text = (out?.text ?? '').trim()
    voiceDebug('offline-stt:done', {
      length: text.length,
      preview: text.slice(0, 120),
    })
    return text
  } catch (err) {
    lastOfflineSttError = formatError(err)
    voiceDebugError('offline-stt:failed', { error: lastOfflineSttError })
    pipelinePromise = null
    pipelineModelId = null
    return ''
  }
}
