import {
  STT_USER_TIMEOUT_MS,
  WHISPER_LONG_AUDIO_SEC,
} from '@/features/voice/context/speech-listen/constants'
import {
  decodeRecordingTo16kMono,
  pcmRms,
  releaseDecodeContext,
} from '@/features/voice/logic/audioDecode'
import { voiceDebug, voiceDebugError, voiceDebugWarn } from '@/features/voice/logic/voiceDebug'
import type { VoiceBootLoadStatus } from '@/features/voice/logic/voiceBootStatus'
import { INITIAL_VOICE_BOOT_STATUS } from '@/features/voice/logic/voiceBootStatus'

type WhisperLang = 'english' | 'japanese' | 'dutch'

const LANG_MAP: Record<string, WhisperLang> = {
  'en-US': 'english',
  'ja-JP': 'japanese',
  'nl-NL': 'dutch',
}

import { resolveWhisperModelId } from '@/features/voice/logic/whisperModels'
import {
  clearWhisperBrowserCaches,
  hasCachedWhisperWeights,
} from '@/features/voice/logic/offlineSttCache'
import {
  cancelScheduledReleaseOfflineStt,
  touchOfflineSttPipeline,
} from '@/features/voice/logic/offlineSttLifecycle'

export { hasCachedWhisperWeights } from '@/features/voice/logic/offlineSttCache'
import { useNozomiStore } from '@/store/useNozomiStore'
import { iosReleaseBeforeWhisperInfer } from '@/features/voice/logic/iosMemoryBudget'
import { getVoicePlatformTuning, isIos, isLowMemoryDevice, isMobileDevice } from '@/utils/device'

const LOAD_TIMEOUT_MS = 180_000
const READY_WAIT_MS = isIos() ? 90_000 : 120_000
const INFER_TIMEOUT_MS = Math.min(90_000, STT_USER_TIMEOUT_MS - 4_000)
const DECODE_TIMEOUT_MS = 20_000
const SILENT_RMS = 0.003

type WasmDtype = 'q4' | 'fp32'

/** q8 breaks on onnxruntime-web 1.26-dev (Missing required scale); try q4 then fp32. */
const WASM_DTYPES_DESKTOP: WasmDtype[] = ['q4', 'fp32']
/** fp32 doubles WASM RAM — skip on iPhone to avoid tab reload after transcribe. */
const WASM_DTYPES_IOS: WasmDtype[] = ['q4']

function wasmDtypesToTry(): WasmDtype[] {
  return isIos() ? WASM_DTYPES_IOS : WASM_DTYPES_DESKTOP
}

type TranscriberOptions = {
  language?: WhisperLang
  task?: string
  chunk_length_s?: number
  stride_length_s?: number
}

type Transcriber = (
  audio: Float32Array,
  options?: TranscriberOptions,
) => Promise<{ text: string }>

let pipelinePromise: Promise<Transcriber> | null = null
let pipelineModelId: string | null = null
let pipelineActiveDtype: WasmDtype | null = null
let pipelineLoadGeneration = 0
let pipelineReadyForLang: string | null = null
let lastOfflineSttError: string | null = null
let transformersEnvReady = false
const downloadLogPct = new Map<string, number>()
let preloadInFlight: Promise<Transcriber> | null = null
let preloadInFlightModel: string | null = null
type OfflineSttLoadProgressListener = (pct: number | null) => void
type OfflineSttLoadStatusListener = (status: VoiceBootLoadStatus) => void

const loadProgressListeners = new Set<OfflineSttLoadProgressListener>()
const loadStatusListeners = new Set<OfflineSttLoadStatusListener>()

let lastLoadStatus: VoiceBootLoadStatus = INITIAL_VOICE_BOOT_STATUS

function aggregateDownloadPct(): number | null {
  const values = [...downloadLogPct.values()]
  if (values.length === 0) return null
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length)
}

function computeLoadStatus(): VoiceBootLoadStatus {
  if (pipelineReadyForLang) {
    return { phase: 'ready', downloadPercent: null }
  }
  const aggregate = aggregateDownloadPct()
  if (aggregate !== null) {
    return { phase: 'downloading_weights', downloadPercent: aggregate }
  }
  if (pipelinePromise) {
    return { phase: 'building_engine', downloadPercent: null }
  }
  return { phase: 'checking_cache', downloadPercent: null }
}

function notifyLoadProgress(): void {
  const status = computeLoadStatus()
  const prev = lastLoadStatus
  if (prev.phase === status.phase && prev.downloadPercent === status.downloadPercent) {
    return
  }
  lastLoadStatus = status
  for (const listener of loadStatusListeners) {
    listener(status)
  }
  const legacyPct =
    status.phase === 'ready'
      ? 100
      : status.phase === 'downloading_weights'
        ? status.downloadPercent
        : null
  for (const listener of loadProgressListeners) {
    listener(legacyPct)
  }
}

/** 0–100 while weights download; null when idle; 100 when ready for lang. */
export function getOfflineSttLoadProgress(lang?: string): number | null {
  if (lang && isOfflineSttReady(lang)) return 100
  const status = computeLoadStatus()
  if (status.phase === 'ready') return 100
  if (status.phase === 'downloading_weights') return status.downloadPercent
  return null
}

export function getOfflineSttLoadStatus(lang?: string): VoiceBootLoadStatus {
  if (lang && isOfflineSttReady(lang)) {
    return { phase: 'ready', downloadPercent: null }
  }
  return computeLoadStatus()
}

export function subscribeOfflineSttLoadProgress(
  listener: OfflineSttLoadProgressListener,
): () => void {
  loadProgressListeners.add(listener)
  listener(getOfflineSttLoadProgress())
  return () => loadProgressListeners.delete(listener)
}

export function subscribeOfflineSttLoadStatus(
  listener: OfflineSttLoadStatusListener,
): () => void {
  loadStatusListeners.add(listener)
  listener(getOfflineSttLoadStatus())
  return () => loadStatusListeners.delete(listener)
}

function whisperLang(bcp47: string): WhisperLang {
  return LANG_MAP[bcp47] ?? 'english'
}

function modelForLang(bcp47: string): string {
  const tier = useNozomiStore.getState().settings.whisperModel ?? 'tiny'
  return resolveWhisperModelId(bcp47, tier)
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
  env.useWasmCache = true
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
  notifyLoadProgress()
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
            notifyLoadProgress()
          }
        } else if (info.status === 'done') {
          downloadLogPct.delete(`${dtype}:${file}`)
          voiceDebug('offline-stt:download-done', { file, dtype })
          notifyLoadProgress()
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
    await hasCachedWhisperWeights(model)
    downloadLogPct.clear()
    notifyLoadProgress()
    let lastErr: unknown
    let purgedDiskForRetry = false
    try {
      for (const dtype of wasmDtypesToTry()) {
        if (generation !== pipelineLoadGeneration) {
          throw new Error('offline-stt:load-superseded')
        }
        try {
          const transcriber = await loadPipelineWithDtype(model, dtype)
          if (generation === pipelineLoadGeneration) {
            pipelineActiveDtype = dtype
            pipelineReadyForLang = bcp47
            voiceDebug('offline-stt:ready', { model, lang: bcp47, dtype })
            notifyLoadProgress()
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
            const dtypes = wasmDtypesToTry()
            const isLastDtype = dtype === dtypes[dtypes.length - 1]
            const purgeDisk =
              !isMobileDevice() || (isLastDtype && !purgedDiskForRetry)
            if (purgeDisk) purgedDiskForRetry = true
            await clearOfflineSttCache({ purgeDisk })
          }
        }
      }
      throw lastErr ?? new Error('offline-stt:all-dtypes-failed')
    } finally {
      notifyLoadProgress()
    }
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
  const model = modelForLang(lang)
  return (
    pipelineModelId === model &&
    pipelinePromise !== null &&
    pipelineReadyForLang !== null
  )
}

function activeLoadForLang(lang: string): Promise<Transcriber> {
  const model = modelForLang(lang)
  if (preloadInFlight && preloadInFlightModel === model) return preloadInFlight
  if (pipelinePromise && pipelineModelId === model) return pipelinePromise
  return loadPipeline(lang)
}

export function whenOfflineSttReady(lang = 'en-US'): Promise<void> {
  if (isOfflineSttReady(lang)) return Promise.resolve()
  return withTimeout(
    activeLoadForLang(lang).then(() => {
      if (!isOfflineSttReady(lang)) {
        throw new Error('offline-stt:pipeline-not-ready')
      }
    }),
    READY_WAIT_MS,
    'offline-stt:ready-wait',
  ).then(() => undefined)
}

export function getLastOfflineSttError(): string | null {
  return lastOfflineSttError
}

export async function clearOfflineSttCache(opts?: {
  purgeDisk?: boolean
}): Promise<void> {
  const purgeDisk = opts?.purgeDisk ?? !isMobileDevice()
  if (purgeDisk) {
    const removed = await clearWhisperBrowserCaches()
    voiceDebug('offline-stt:cache-cleared', { caches: removed })
  } else {
    voiceDebug('offline-stt:session-reset', { purgeDisk: false })
  }
  pipelinePromise = null
  pipelineModelId = null
  pipelineReadyForLang = null
  pipelineActiveDtype = null
  lastLoadStatus = INITIAL_VOICE_BOOT_STATUS
  notifyLoadProgress()
}

/** Drop in-memory Whisper session (model files stay in Cache API). */
export function releaseOfflineSttPipeline(opts?: { force?: boolean }): void {
  if (isMobileDevice() && !opts?.force) {
    voiceDebug('offline-stt:pipeline-release-skipped', { reason: 'mobile-session' })
    return
  }
  pipelinePromise = null
  pipelineModelId = null
  pipelineReadyForLang = null
  pipelineActiveDtype = null
  preloadInFlight = null
  preloadInFlightModel = null
  downloadLogPct.clear()
  lastLoadStatus = INITIAL_VOICE_BOOT_STATUS
  notifyLoadProgress()
  voiceDebug('offline-stt:pipeline-released')
}

/**
 * Free decode buffers and (on mobile) the WASM session after a turn's transcribe step
 * so NLU/TTS do not run beside Whisper in the same tab (iOS OOM).
 */
async function yieldAfterWhisperRelease(settleMs: number): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, settleMs)
      })
    })
  })
}

/** Drop WASM before opening the mic on mobile (weights stay cached on disk). */
export async function parkWhisperForMicCapture(): Promise<void> {
  if (!isMobileDevice()) return
  releaseDecodeContext()
  if (pipelinePromise || pipelineReadyForLang) {
    releaseOfflineSttPipeline({ force: true })
    await yieldAfterWhisperRelease(isIos() ? 360 : 90)
    voiceDebug('offline-stt:parked-for-mic')
  }
}

export async function releaseWhisperSessionAfterTranscribe(): Promise<void> {
  releaseDecodeContext()
  if (!isMobileDevice()) return
  releaseOfflineSttPipeline({ force: true })
  await yieldAfterWhisperRelease(isIos() ? 480 : 160)
  voiceDebug('offline-stt:post-transcribe-released')
}

export function preloadOfflineStt(lang = 'en-US', opts?: { force?: boolean }): void {
  if (!opts?.force && isMobileDevice()) {
    voiceDebug('offline-stt:preload-skipped', { reason: 'mobile-boot' })
    return
  }
  if (!opts?.force && isLowMemoryDevice()) {
    voiceDebug('offline-stt:preload-skipped', { reason: 'low-memory' })
    return
  }
  const model = modelForLang(lang)
  if (isOfflineSttReady(lang)) return
  if (preloadInFlight && preloadInFlightModel === model) return
  cancelScheduledReleaseOfflineStt()
  const generation = pipelineLoadGeneration
  preloadInFlightModel = model
  preloadInFlight = activeLoadForLang(lang)
  void preloadInFlight
    .then(() => {
      touchOfflineSttPipeline()
    })
    .catch((err) => {
      noteLoadFailure(err, generation)
    })
    .finally(() => {
      if (preloadInFlightModel === model) {
        preloadInFlight = null
        preloadInFlightModel = null
      }
    })
}

export type TranscribeBlobOptions = {
  /** When true, skip the silence gate (mic already detected voice energy). */
  hadSound?: boolean
  /**
   * Pre-decoded 16 kHz mono PCM (mobile path).
   * Skips decode so WASM is not loaded while AudioContext buffers are live.
   */
  pcm?: Float32Array
}

export async function transcribeAudioBlob(
  blob: Blob,
  bcp47: string,
  options: TranscribeBlobOptions = {},
): Promise<string> {
  if (!options.pcm && !blob.size) return ''
  lastOfflineSttError = null
  voiceDebug('offline-stt:start', {
    bytes: blob.size,
    lang: bcp47,
    predecoded: !!options.pcm,
  })

  try {
    const audio = options.pcm
      ? options.pcm
      : await withTimeout(
          decodeRecordingTo16kMono(blob),
          DECODE_TIMEOUT_MS,
          'offline-stt:decode',
        )
    voiceDebug('offline-stt:decoded', {
      samples: audio.length,
      durationSec: +(audio.length / 16_000).toFixed(2),
    })
    if (audio.length < 1600) {
      voiceDebugWarn('offline-stt:too-short', { samples: audio.length })
      return ''
    }

    const rms = pcmRms(audio)
    const durationSec = audio.length / 16_000
    voiceDebug('offline-stt:levels', { rms: +rms.toFixed(5), durationSec: +durationSec.toFixed(2) })
    // Skip infer only when the mic never saw energy (avoids 10s silent hangs without
    // rejecting quiet speech that decoded with low RMS).
    if (rms < SILENT_RMS && !options.hadSound) {
      lastOfflineSttError = 'offline-stt:silent'
      voiceDebugWarn('offline-stt:silent', {
        rms,
        durationSec,
        hadSound: false,
      })
      return ''
    }

    await iosReleaseBeforeWhisperInfer()

    touchOfflineSttPipeline()
    cancelScheduledReleaseOfflineStt()
    const transcriber = await loadPipeline(bcp47)
    voiceDebug('offline-stt:infer', {
      samples: audio.length,
      dtype: pipelineActiveDtype,
    })
    const heartbeat = window.setInterval(() => {
      voiceDebug('offline-stt:infer-wait', { dtype: pipelineActiveDtype })
    }, 5000)
    const tuning = getVoicePlatformTuning()
    const lowMem = isIos() || isLowMemoryDevice()
    const longClip = durationSec >= WHISPER_LONG_AUDIO_SEC
    const chunkSec = longClip
      ? isIos()
        ? tuning.whisperLongChunkSec
        : 30
      : isIos()
        ? tuning.whisperChunkSec
        : lowMem
          ? 6
          : 15
    const strideSec = longClip
      ? isIos()
        ? tuning.whisperLongStrideSec
        : 5
      : isIos()
        ? tuning.whisperStrideSec
        : lowMem
          ? 2
          : 3
    let out: { text?: string }
    try {
      out = await withTimeout(
        transcriber(audio, {
          language: whisperLang(bcp47),
          task: 'transcribe',
          chunk_length_s: chunkSec,
          stride_length_s: strideSec,
        }),
        INFER_TIMEOUT_MS,
        'offline-stt:infer',
      )
    } finally {
      window.clearInterval(heartbeat)
    }
    const text = (out?.text ?? '').trim()
    voiceDebug('offline-stt:done', {
      length: text.length,
      preview: text.slice(0, 120),
    })
    releaseDecodeContext()
    return text
  } catch (err) {
    lastOfflineSttError = formatError(err)
    voiceDebugError('offline-stt:failed', { error: lastOfflineSttError })
    if (isOrtSessionLoadError(err)) {
      void clearOfflineSttCache({ purgeDisk: !isMobileDevice() })
      pipelinePromise = null
      pipelineModelId = null
      pipelineReadyForLang = null
      pipelineActiveDtype = null
    }
    throw err instanceof Error ? err : new Error(lastOfflineSttError)
  }
}
