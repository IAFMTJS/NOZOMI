/** Rank browser TTS voices for Nozomi — calm, natural Japanese (female-first). */

export const NOZOMI_VOICE_AUTO = 'auto'

const QUALITY_BOOST: Array<{ re: RegExp; pts: number }> = [
  { re: /neural|natural|enhanced|premium|wavenet|generative/i, pts: 28 },
  { re: /online.*natural|natural.*online/i, pts: 32 },
  { re: /standard-[ab]|studio/i, pts: 18 },
]

/** Known high-quality voices across Safari, Chrome, Edge, Windows. */
const NAME_BOOST: Array<{ re: RegExp; pts: number }> = [
  { re: /kyoko/i, pts: 42 },
  { re: /nanami/i, pts: 40 },
  { re: /haruka/i, pts: 38 },
  { re: /ayumi|moeka|sayaka|mairi|tomoko|kaori/i, pts: 34 },
  { re: /google.*日本|japanese.*google|ja-jp.*google/i, pts: 30 },
  { re: /microsoft.*日本|japanese.*\(japan\)/i, pts: 22 },
  { re: /otoya/i, pts: 18 },
  { re: /ichiro|keita|takeshi/i, pts: 12 },
]

const NAME_PENALTY: Array<{ re: RegExp; pts: number }> = [
  { re: /compact|super-?compact|espeak|samantha|zarvox|cellos|whisper/i, pts: -45 },
  { re: /bad|bells|boing|bubbles|junior|organ|trinoids|good news/i, pts: -80 },
]

export function scoreJapaneseVoice(voice: SpeechSynthesisVoice): number {
  let score = 0
  const lang = voice.lang.toLowerCase()
  const name = voice.name

  if (lang === 'ja-jp') score += 14
  else if (lang.startsWith('ja')) score += 8
  else return -999

  if (voice.localService) score += 12

  const lower = name.toLowerCase()
  for (const { re, pts } of QUALITY_BOOST) {
    if (re.test(lower) || re.test(name)) score += pts
  }
  for (const { re, pts } of NAME_BOOST) {
    if (re.test(lower) || re.test(name)) score += pts
  }
  for (const { re, pts } of NAME_PENALTY) {
    if (re.test(lower)) score += pts
  }

  if (/\(enhanced\)|\(premium\)/i.test(name)) score += 8
  if (/\bfemale\b/i.test(lower)) score += 6
  if (/\bmale\b/i.test(lower)) score -= 4

  return score
}

export function listJapaneseVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return []
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('ja'))
}

export function listRankedJapaneseVoices(): SpeechSynthesisVoice[] {
  return [...listJapaneseVoices()].sort(
    (a, b) => scoreJapaneseVoice(b) - scoreJapaneseVoice(a),
  )
}

export function formatJapaneseVoiceLabel(voice: SpeechSynthesisVoice): string {
  const name = voice.name.replace(/\s+/g, ' ').trim()
  const lang = voice.lang.replace(/_/g, '-')
  if (name.toLowerCase().includes(lang.toLowerCase())) return name
  return `${name} (${lang})`
}

export function pickJapaneseVoice(
  preferredUri: string = NOZOMI_VOICE_AUTO,
): SpeechSynthesisVoice | undefined {
  const ranked = listRankedJapaneseVoices()
  if (!ranked.length) return undefined

  if (preferredUri && preferredUri !== NOZOMI_VOICE_AUTO) {
    const chosen = ranked.find((v) => v.voiceURI === preferredUri)
    if (chosen) return chosen
  }

  return ranked[0]
}

/** Slightly slower, warmer delivery suited to a calm tutor persona. */
export function nozomiSpeechDefaults(isMobile: boolean): { rate: number; pitch: number } {
  return {
    rate: isMobile ? 0.9 : 0.94,
    pitch: isMobile ? 1.03 : 1.05,
  }
}

export function warmJapaneseVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.getVoices()
}
