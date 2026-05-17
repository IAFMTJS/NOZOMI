import {
  NOZOMI_VOICE_AUTO,
  nozomiSpeechDefaults,
  pickJapaneseVoice,
  warmJapaneseVoices,
} from '@/systems/speech/japaneseVoicePicker'

let synthUtterance: SpeechSynthesisUtterance | null = null
let speakGeneration = 0

export function isSpeechOutputActive(): boolean {
  if (!('speechSynthesis' in window)) return false
  const s = window.speechSynthesis
  return s.speaking || s.pending
}

export function whenSpeechOutputIdle(maxWaitMs = 5000): Promise<void> {
  if (!isSpeechOutputActive()) return Promise.resolve()
  return new Promise((resolve) => {
    const started = Date.now()
    const poll = () => {
      if (!isSpeechOutputActive() || Date.now() - started >= maxWaitMs) {
        resolve()
        return
      }
      requestAnimationFrame(poll)
    }
    poll()
  })
}

export function micCooldownAfterSpeechMs(): number {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 220 : 0
}

export function speakJapanese(
  text: string,
  opts: {
    rate?: number
    pitch?: number
    voiceUri?: string
    onStart?: () => void
    onEnd?: () => void
  } = {},
): void {
  if (!('speechSynthesis' in window)) return
  const gen = ++speakGeneration
  window.speechSynthesis.cancel()
  synthUtterance = new SpeechSynthesisUtterance(text)
  synthUtterance.lang = 'ja-JP'
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const defaults = nozomiSpeechDefaults(isMobile)
  synthUtterance.rate = opts.rate ?? defaults.rate
  synthUtterance.pitch = opts.pitch ?? defaults.pitch

  const preferredUri = opts.voiceUri ?? NOZOMI_VOICE_AUTO

  const fireEnd = () => {
    if (gen !== speakGeneration) return
    opts.onEnd?.()
  }
  synthUtterance.onstart = () => {
    if (gen !== speakGeneration) return
    opts.onStart?.()
  }
  synthUtterance.onend = fireEnd
  synthUtterance.onerror = fireEnd

  const applyVoice = () => {
    const voice = pickJapaneseVoice(preferredUri)
    if (voice && synthUtterance) synthUtterance.voice = voice
  }

  const speak = () => {
    if (gen !== speakGeneration || !synthUtterance) return
    applyVoice()
    window.speechSynthesis.speak(synthUtterance)
  }

  applyVoice()

  if (window.speechSynthesis.getVoices().length === 0) {
    const onVoices = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
      speak()
    }
    window.speechSynthesis.addEventListener('voiceschanged', onVoices)
    warmJapaneseVoices()
    return
  }
  speak()
}

export function stopSpeaking(): void {
  speakGeneration++
  window.speechSynthesis?.cancel()
}
