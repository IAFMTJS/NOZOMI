/** `local` = record mic + Whisper in-browser; `browser` = Web Speech API. */
export type SttEngine = 'local' | 'browser'

const STORAGE_KEY = 'nozomi.sttEngine'

/** In-memory override for this tab only (e.g. one-shot browser fallback). */
let sessionEngineOverride: SttEngine | null = null

function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

export function browserSttAvailable(): boolean {
  const w = window as Window & {
    SpeechRecognition?: typeof SpeechRecognition
    webkitSpeechRecognition?: typeof SpeechRecognition
  }
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition)
}

/** Default engine when user has not chosen one in settings. */
export function getDefaultSttEngine(): SttEngine {
  if (isMobileDevice() && browserSttAvailable()) {
    return 'browser'
  }
  return 'local'
}

export function getSttEngine(): SttEngine {
  if (sessionEngineOverride) return sessionEngineOverride
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'browser' || v === 'local') return v
  } catch {
    /* ignore */
  }
  return getDefaultSttEngine()
}

export function setSttEngine(engine: SttEngine): void {
  try {
    localStorage.setItem(STORAGE_KEY, engine)
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
