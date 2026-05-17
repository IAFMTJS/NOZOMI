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

/** q8 breaks on onnxruntime-web 1.26-dev (Missing required scale); try q4 then fp32. */
const WASM_DTYPES = ['q4', 'fp32'] as const
type WasmDtype = (typeof WASM_DTYPES)[number]

type Transcriber = (
  audio: Float32Array,
  options?: { language?: WhisperLang; task?: string },
) => Promise<{ text: string }>

let pipelinePromise: Promise<Transcriber> | null = null
let pipelineModelId: string | null = null
let pipelineActiveDtype: WasmDtype | null = null
let pipelineLoadGeneration = 0
let pipelineReadyForLang: string | null = null
let lastOfflineSttError: string | null = null
let transformersEnvReady = false
const downloadLogPct = new Map<string, number>()

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

export function isOrtSessionLoadError(err: unknown): boolean {
  const msg = formatError(err)
  return (
    msg.includes("Can't create a session") ||
    msg.includes('Missing required scale') ||
    msg.includes('TransposeDQWeightsForMatMulNBits')
  )
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

async function loadPipelineWithDtype(
  model: string,
  dtype: WasmDtype,
): Promise<Transcriber> {
  voiceDebug('offline-stt:load-model', { model, device: 'wasm', dtype })
  await configureTransformersEnv()
  const { pipeline } = await import('@huggingface/transformers')
  return withTimeout(
    pipeline('automatic-speech-recognition', model, {
      device: 'wasm',
      dtype,
      progress_callback: (info) => {
        const meta = info as { file?: string; name?: string }
        const file = String(meta.file ?? meta.name ?? 'file')
        if (info.status === 'progress' && typeof info.progress === 'number') {
          const pct = Math.round(info.progress)
          const bucket =
            pct >= 100 ? 100 : pct >= 95 ? 95 : Math.floor(pct / 10) * 10
          const key = `${dtype}:${file}`
          const prev = downloadLogPct.get(key) ?? -1
          if (bucket > prev) {
            downloadLogPct.set(key, bucket)
            voiceDebug('offline-stt:download', { file, progress: pct, dtype })
          }
        } else if (info.status === 'done') {
          downloadLogPct.delete(`${dtype}:${file}`)
          voiceDebug('offline-stt:download-done', { file, dtype })
        }
      },
    }) as Promise<Transcriber>,
    LOAD_TIMEOUT_MS,
    `offline-stt:load-model:${dtype}`,
  )
}

async function loadPipeline(bcp47: string): Promise<Transcriber> {
  const model = modelForLang(bcp47)
  if (pipelinePromise && pipelineModelId === model) {
    return pipelinePromise
  }

  const generation = ++pipelineLoadGeneration
  pipelineModelId = model
  pipelineReadyForLang = null
  pipelineActiveDtype = null
  lastOfflineSttError = null

  pipelinePromise = (async () => {
    let lastErr: unknown
    for (const dtype of WASM_DTYPES) {
      if (generation !== pipelineLoadGeneration) {
        throw new Error('offline-stt:load-superseded')
      }
      try {
        const transcriber = await loadPipelineWithDtype(model, dtype)
        if (generation === pipelineLoadGeneration) {
          pipelineActiveDtype = dtype
          pipelineReadyForLang = bcp47
          voiceDebug('offline-stt:ready', { model, lang: bcp47, dtype })
        }
        return transcriber
      } catch (err) {
        lastErr = err
        voiceDebugWarn('offline-stt:dtype-failed', {
          dtype,
          error: formatError(err).slice(0, 400),
        })
        if (generation !== pipelineLoadGeneration) throw err
        if (isOrtSessionLoadError(err)) {
          await clearOfflineSttCache()
        }
      }
    }
    throw lastErr ?? new Error('offline-stt:all-dtypes-failed')
  })()

  try {
    return await pipelinePromise
  } catch (err) {
    if (generation === pipelineLoadGeneration) {
      pipelinePromise = null
      pipelineModelId = null
      pipelineReadyForLang = null
      pipelineActiveDtype = null
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
  pipelineActiveDtype = null
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
  if (typeof caches !== 'undefined') {
    const keys = await caches.keys()
    await Promise.all(
      keys
        .filter((k) => /transformers|onnx|whisper/i.test(k))
        .map((k) => caches.delete(k)),
    )
  }
  pipelinePromise = null
  pipelineModelId = null
  pipelineReadyForLang = null
  pipelineActiveDtype = null
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
    voiceDebug('offline-stt:infer', {
      samples: audio.length,
      dtype: pipelineActiveDtype,
    })
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
    if (isOrtSessionLoadError(err)) {
      void clearOfflineSttCache()
    }
    pipelinePromise = null
    pipelineModelId = null
    pipelineReadyForLang = null
    pipelineActiveDtype = null
    return ''
  }
}
