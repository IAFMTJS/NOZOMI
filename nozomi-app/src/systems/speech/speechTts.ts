let synthUtterance: SpeechSynthesisUtterance | null = null
let speakGeneration = 0

function scoreJapaneseVoice(voice: SpeechSynthesisVoice): number {
  let score = 0
  if (voice.lang === 'ja-JP') score += 12
  else if (voice.lang.startsWith('ja')) score += 6
  if (voice.localService) score += 10
  const name = voice.name.toLowerCase()
  if (
    name.includes('kyoko') ||
    name.includes('otoya') ||
    name.includes('enhanced') ||
    name.includes('premium')
  ) {
    score += 14
  }
  if (name.includes('google') && name.includes('日本')) score += 6
  if (name.includes('compact') || name.includes('super-compact')) score -= 12
  return score
}

function pickJapaneseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const ja = voices.filter((v) => v.lang.startsWith('ja'))
  if (!ja.length) return undefined
  return [...ja].sort((a, b) => scoreJapaneseVoice(b) - scoreJapaneseVoice(a))[0]
}

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
  opts: { rate?: number; pitch?: number; onStart?: () => void; onEnd?: () => void },
): void {
  if (!('speechSynthesis' in window)) return
  const gen = ++speakGeneration
  window.speechSynthesis.cancel()
  synthUtterance = new SpeechSynthesisUtterance(text)
  synthUtterance.lang = 'ja-JP'
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  synthUtterance.rate = opts.rate ?? (isMobile ? 0.92 : 1)
  synthUtterance.pitch = opts.pitch ?? (isMobile ? 1.02 : 1)
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

  const voice = pickJapaneseVoice()
  if (voice) synthUtterance.voice = voice

  const speak = () => {
    if (gen !== speakGeneration || !synthUtterance) return
    const v = pickJapaneseVoice()
    if (v) synthUtterance.voice = v
    window.speechSynthesis.speak(synthUtterance)
  }

  if (window.speechSynthesis.getVoices().length === 0) {
    const onVoices = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
      speak()
    }
    window.speechSynthesis.addEventListener('voiceschanged', onVoices)
    window.speechSynthesis.getVoices()
    return
  }
  speak()
}

export function stopSpeaking(): void {
  speakGeneration++
  window.speechSynthesis?.cancel()
}
