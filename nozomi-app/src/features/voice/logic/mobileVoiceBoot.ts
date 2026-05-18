/**
 * Mobile voice boot: load Whisper once after app data is ready, before routes.
 * Model weights stay in the browser Cache API; this step builds the in-memory WASM session.
 */
import {
  hasCachedWhisperWeights,
  isOfflineSttReady,
  preloadOfflineStt,
  releaseOfflineSttPipeline,
  subscribeOfflineSttLoadProgress,
  whenOfflineSttReady,
} from '@/features/voice/logic/offlineStt'
import { resolveWhisperModelId } from '@/features/voice/logic/whisperModels'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import { getSttEngine, resolveSttEngineForLang } from '@/features/voice/logic/sttEngine'
import { warmJapaneseVoices } from '@/features/voice/logic/japaneseVoicePicker'
import { touchOfflineSttPipeline } from '@/features/voice/logic/offlineSttLifecycle'
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
  onProgress: (pct: number | null) => void,
): Promise<void> {
  const key = mobileVoiceBootStorageKey(lang)
  if (isOfflineSttReady(lang)) {
    onProgress(100)
    writeMobileVoiceBootCache(key)
    touchOfflineSttPipeline()
    releaseOfflineSttPipeline({ force: true })
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
    const modelId = resolveWhisperModelId(
      lang,
      useNozomiStore.getState().settings.whisperModel ?? 'tiny',
    )
    const weightsCached = await hasCachedWhisperWeights(modelId)
    onProgress(weightsCached ? 72 : 0)

    const unsub = subscribeOfflineSttLoadProgress((pct) => {
      onProgress(isOfflineSttReady(lang) ? 100 : pct)
    })
    preloadOfflineStt(lang, { force: true })
    try {
      await whenOfflineSttReady(lang)
      if (!isOfflineSttReady(lang)) {
        throw new Error('Speech model did not become ready')
      }
      writeMobileVoiceBootCache(key)
      touchOfflineSttPipeline()
      onProgress(100)
      // Park WASM so the first orb tap only opens the mic (avoids mic + Whisper OOM).
      releaseOfflineSttPipeline({ force: true })
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

export function invalidateMobileVoiceBootFlight(): void {
  bootInFlight = null
  bootInFlightKey = null
}
