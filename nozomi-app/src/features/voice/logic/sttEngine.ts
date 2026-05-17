import { resolveSpeechRecognitionLang } from '@/systems/speech/speechLocale'
import { isIos, isWindows } from '@/utils/device'

/** `local` = record mic + Whisper in-browser; `browser` = Web Speech API. */
export type SttEngine = 'local' | 'browser'

const STORAGE_KEY = 'nozomi.sttEngine'

/** In-memory override for this tab only (e.g. one-shot browser fallback). */
let sessionEngineOverride: SttEngine | null = null

export function browserSttAvailable(): boolean {
  const w = window as Window & {
    SpeechRecognition?: typeof SpeechRecognition
    webkitSpeechRecognition?: typeof SpeechRecognition
  }
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

/**
 * Windows ties Web Speech API to the OS display-language speech pack.
 * ja-JP on a Dutch/English Windows UI triggers a blocking system error dialog.
 */
export function browserSttViableForLang(bcp47: string): boolean {
  if (!browserSttAvailable()) return false
  if (!isWindows()) return true
  const ui = (navigator.language || '').toLowerCase()
  const want = bcp47.toLowerCase()
  return ui.split('-')[0] === want.split('-')[0]
}

/** Pick the engine that can actually run for this recognition language. */
export function resolveSttEngineForLang(
  preferred: SttEngine,
  recognitionLang: string,
): SttEngine {
  if (preferred === 'local') return 'local'
  if (isIos() || !browserSttAvailable()) return 'local'
  if (!browserSttViableForLang(recognitionLang)) return 'local'
  return 'browser'
}

/** Default engine when user has not chosen one in settings. */
export function getDefaultSttEngine(): SttEngine {
  if (isIos()) return 'local'
  const defaultLang = resolveSpeechRecognitionLang('auto')
  if (browserSttAvailable() && browserSttViableForLang(defaultLang)) {
    return 'browser'
  }
  return 'local'
}

export function readStoredSttEngine(): SttEngine | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'browser' || v === 'local') return v
  } catch {
    /* ignore */
  }
  return null
}

export function getSttEngine(): SttEngine {
  if (sessionEngineOverride) return normalizeEngine(sessionEngineOverride)
  const stored = readStoredSttEngine()
  if (stored) return normalizeEngine(stored)
  return normalizeEngine(getDefaultSttEngine())
}

/** iOS has no Web Speech API — never run the browser engine there. */
function normalizeEngine(engine: SttEngine): SttEngine {
  if (engine === 'browser' && (isIos() || !browserSttAvailable())) {
    return 'local'
  }
  return engine
}

export function setSttEngine(engine: SttEngine): void {
  try {
    localStorage.setItem(STORAGE_KEY, normalizeEngine(engine))
  } catch {
    /* ignore */
  }
}

export function setSessionSttEngine(engine: SttEngine | null): void {
  sessionEngineOverride = engine
}

export function clearSessionSttEngine(): void {
  sessionEngineOverride = null
}

export function isBrowserSttSelectable(recognitionLang?: string): boolean {
  if (!browserSttAvailable() || isIos()) return false
  const lang = recognitionLang ?? resolveSpeechRecognitionLang('auto')
  return browserSttViableForLang(lang)
}
