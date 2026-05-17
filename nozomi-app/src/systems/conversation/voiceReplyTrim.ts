import type { LanguageText } from '@/types/domain'

const MAX_VOICE_JP_CHARS = 120

/** Keep spoken replies short for lower TTS latency. */
export function trimForVoiceReply(text: LanguageText): LanguageText {
  if (text.jp.length <= MAX_VOICE_JP_CHARS) return text
  const cut = text.jp.slice(0, MAX_VOICE_JP_CHARS)
  const lastBreak = Math.max(
    cut.lastIndexOf('。'),
    cut.lastIndexOf('！'),
    cut.lastIndexOf('？'),
    cut.lastIndexOf('.'),
  )
  const jp =
    lastBreak > 40 ? cut.slice(0, lastBreak + 1) : `${cut.trim()}…`
  return {
    jp,
    romaji: text.romaji,
    en: text.en,
  }
}
