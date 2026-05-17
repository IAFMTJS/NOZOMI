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

const LOAD_TIMEOUT_MS = 180_000

type Transcriber = (
  audio: Float32Array,
  options?: { language?: WhisperLang; task?: string },
) => Promise<{ text: string }>

let pipelinePromise: Promise<Transcriber> | null = null
let pipelineModelId: string | null = null
let pipelineLoadGeneration = 0
let pipelineReadyForLang: string | null = null
let lastOfflineSttError: string | null = null
let transformersEnvReady = false

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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

async function configureTransformersEnv(): Promise<void> {
  if (transformersEnvReady) return
  const { env } = await import('@huggingface/transformers')
  env.allowLocalModels = false
  env.useBrowserCache = true
  env.useWasmCache = false
  const wasm = env.backends?.onnx?.wasm
  if (wasm) {
    wasm.numThreads = 1
    delete wasm.wasmPaths
    delete wasm.wasmBinary
  }

  transformersEnvReady = true
  voiceDebug('offline-stt:env', {
    crossOriginIsolated: typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated,
    ortWebVersion: env.backends?.onnx?.versions?.web ?? null,
    device: 'wasm',
    wasmPaths: env.backends?.onnx?.wasm?.wasmPaths ?? null,
  })
}

async function loadPipeline(bcp47: string): Promise<Transcriber> {
  const model = modelForLang(bcp47)
  if (pipelinePromise && pipelineModelId === model) {
    return pipelinePromise
  }

  const generation = ++pipelineLoadGeneration
  pipelineModelId = model
  pipelineReadyForLang = null
  pipelinePromise = withTimeout(
    (async () => {
      voiceDebug('offline-stt:load-model', { model, device: 'wasm' })
      await configureTransformersEnv()
      const { pipeline } = await import('@huggingface/transformers')
      return pipeline('automatic-speech-recognition', model, {
        device: 'wasm',
        dtype: 'q8',
        progress_callback: (info) => {
          if (info.status === 'progress' && typeof info.progress === 'number') {
            const pct = Math.round(info.progress)
            if (pct % 10 === 0 || pct >= 95) {
              voiceDebug('offline-stt:download', {
                file: info.file ?? info.name,
                progress: pct,
              })
            }
          } else if (info.status === 'done') {
            voiceDebug('offline-stt:download-done', { file: info.file ?? info.name })
          }
        },
      }) as Promise<Transcriber>
    })(),
    LOAD_TIMEOUT_MS,
    'offline-stt:load-model',
  )

  try {
    const transcriber = await pipelinePromise
    if (generation === pipelineLoadGeneration) {
      pipelineReadyForLang = bcp47
      voiceDebug('offline-stt:ready', { model, lang: bcp47 })
    }
    return transcriber
  } catch (err) {
    if (generation === pipelineLoadGeneration) {
      pipelinePromise = null
      pipelineModelId = null
      pipelineReadyForLang = null
    }
    throw err
  }
}

function noteLoadFailure(err: unknown, generation: number): void {
  if (generation !== pipelineLoadGeneration) return
  lastOfflineSttError = formatError(err)
  voiceDebugError('offline-stt:preload-failed', { error: lastOfflineSttError })
  pipelinePromise = null
  pipelineModelId = null
  pipelineReadyForLang = null
}

export function isOfflineSttReady(lang = 'en-US'): boolean {
  return pipelineReadyForLang === lang && pipelinePromise !== null
}

export function whenOfflineSttReady(lang = 'en-US'): Promise<void> {
  if (isOfflineSttReady(lang)) return Promise.resolve()
  return loadPipeline(lang).then(() => undefined)
}

export function getLastOfflineSttError(): string | null {
  return lastOfflineSttError
}

export async function clearOfflineSttCache(): Promise<void> {
  if (typeof caches === 'undefined') return
  await caches.delete('transformers-cache')
  pipelinePromise = null
  pipelineModelId = null
  pipelineReadyForLang = null
  voiceDebug('offline-stt:cache-cleared')
}

export function preloadOfflineStt(lang = 'en-US'): void {
  const generation = pipelineLoadGeneration
  void loadPipeline(lang).catch((err) => noteLoadFailure(err, generation))
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
    voiceDebug('offline-stt:infer', { samples: audio.length })
    const out = await withTimeout(
      transcriber(audio, {
        language: whisperLang(bcp47),
        task: 'transcribe',
      }),
      60_000,
      'offline-stt:infer',
    )
    const text = (out?.text ?? '').trim()
    voiceDebug('offline-stt:done', {
      length: text.length,
      preview: text.slice(0, 120),
    })
    return text
  } catch (err) {
    lastOfflineSttError = formatError(err)
    voiceDebugError('offline-stt:failed', { error: lastOfflineSttError })
    if (lastOfflineSttError.includes("Can't create a session")) {
      void clearOfflineSttCache()
    }
    pipelinePromise = null
    pipelineModelId = null
    pipelineReadyForLang = null
    return ''
  }
}
