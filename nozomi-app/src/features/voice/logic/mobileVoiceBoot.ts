/**
 * Mobile voice boot: load Whisper once after app data is ready, before routes.
 * Model weights stay in the browser Cache API; this step builds the in-memory WASM session.
 */
import {
  hasCachedWhisperWeights,
  isOfflineSttReady,
  preloadOfflineStt,
  releaseOfflineSttPipeline,
  subscribeOfflineSttLoadStatus,
  whenOfflineSttReady,
} from '@/features/voice/logic/offlineStt'
import { resolveWhisperModelId } from '@/features/voice/logic/whisperModels'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import { getSttEngine, resolveSttEngineForLang } from '@/features/voice/logic/sttEngine'
import { warmMicRecorderCodecs } from '@/features/voice/logic/micRecorderWarmup'
import { warmJapaneseVoices } from '@/features/voice/logic/japaneseVoicePicker'
import { touchOfflineSttPipeline } from '@/features/voice/logic/offlineSttLifecycle'
import type { VoiceBootLoadStatus } from '@/features/voice/logic/voiceBootStatus'
import { INITIAL_VOICE_BOOT_STATUS } from '@/features/voice/logic/voiceBootStatus'
import { useNozomiStore } from '@/store/useNozomiStore'
import { isMobileDevice } from '@/utils/device'
import { voiceDebug, voiceDebugWarn } from '@/features/voice/logic/voiceDebug'

const STORAGE_KEY = 'nozomi_mobile_voice_boot_v1'

export type MobileVoiceBootPhase = 'idle' | 'loading' | 'ready' | 'skipped' | 'error'

export function mobileVoiceBootStorageKey(lang: string): string {
  const tier = useNozomiStore.getState().settings.whisperModel ?? 'tiny'
  return `${lang}:${resolveWhisperModelId(lang, tier)}`
}

export function readMobileVoiceBootCache(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function writeMobileVoiceBootCache(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key)
  } catch {
    /* quota / private mode */
  }
}

export function clearMobileVoiceBootCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Mobile + local Whisper STT — needs upfront boot, not lazy load on /listen. */
export function needsMobileVoiceBoot(lang?: string): boolean {
  if (!isMobileDevice()) return false
  const recognitionLang =
    lang ?? resolveSpeechRecognitionLang(useNozomiStore.getState().settings.speechInputLang)
  const engine = resolveSttEngineForLang(getSttEngine(), recognitionLang)
  return engine === 'local'
}

/** Boot finished (weights cached); WASM session may be parked until transcribe. */
export function isMobileVoiceBootComplete(lang?: string): boolean {
  if (!needsMobileVoiceBoot(lang)) return true
  const recognitionLang =
    lang ?? resolveSpeechRecognitionLang(useNozomiStore.getState().settings.speechInputLang)
  return readMobileVoiceBootCache() === mobileVoiceBootStorageKey(recognitionLang)
}

let bootInFlight: Promise<void> | null = null
let bootInFlightKey: string | null = null

export async function runMobileVoiceBoot(
  lang: string,
  onStatus: (status: VoiceBootLoadStatus) => void,
): Promise<void> {
  const key = mobileVoiceBootStorageKey(lang)
  if (isOfflineSttReady(lang)) {
    onStatus({ phase: 'ready', downloadPercent: null })
    writeMobileVoiceBootCache(key)
    touchOfflineSttPipeline()
    releaseOfflineSttPipeline({ force: true })
    warmMicRecorderCodecs()
    return
  }
  if (bootInFlight && bootInFlightKey === key) {
    await bootInFlight
    return
  }

  voiceDebug('mobile-voice-boot:start', {
    lang,
    key,
    cached: readMobileVoiceBootCache() === key,
  })

  bootInFlightKey = key
  bootInFlight = (async () => {
    onStatus(INITIAL_VOICE_BOOT_STATUS)
    const modelId = resolveWhisperModelId(
      lang,
      useNozomiStore.getState().settings.whisperModel ?? 'tiny',
    )
    const weightsCached = await hasCachedWhisperWeights(modelId)
    onStatus(
      weightsCached
        ? { phase: 'building_engine', downloadPercent: null }
        : { phase: 'checking_cache', downloadPercent: null },
    )

    const unsub = subscribeOfflineSttLoadStatus((status) => {
      onStatus(isOfflineSttReady(lang) ? { phase: 'ready', downloadPercent: null } : status)
    })
    preloadOfflineStt(lang, { force: true })
    try {
      await whenOfflineSttReady(lang)
      if (!isOfflineSttReady(lang)) {
        throw new Error('Speech model did not become ready')
      }
      writeMobileVoiceBootCache(key)
      touchOfflineSttPipeline()
      onStatus({ phase: 'ready', downloadPercent: null })
      releaseOfflineSttPipeline({ force: true })
      warmMicRecorderCodecs()
      if ('speechSynthesis' in window) {
        window.setTimeout(() => warmJapaneseVoices(), 800)
      }
      voiceDebug('mobile-voice-boot:ready', { lang, key, parked: true })
    } finally {
      unsub()
      if (bootInFlightKey === key) {
        bootInFlight = null
        bootInFlightKey = null
      }
    }
  })()

  try {
    await bootInFlight
  } catch (err) {
    voiceDebugWarn('mobile-voice-boot:failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}

/** @deprecated Use onStatus callback with VoiceBootLoadStatus */
export async function runMobileVoiceBootLegacy(
  lang: string,
  onProgress: (pct: number | null) => void,
): Promise<void> {
  return runMobileVoiceBoot(lang, (status) => {
    onProgress(
      status.phase === 'ready'
        ? 100
        : status.phase === 'downloading_weights'
          ? status.downloadPercent
          : null,
    )
  })
}

export function invalidateMobileVoiceBootFlight(): void {
  bootInFlight = null
  bootInFlightKey = null
}
