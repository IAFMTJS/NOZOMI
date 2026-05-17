import type { SpeechInputLang } from '@/types/domain'

/** Pick a BCP-47 tag for Web Speech API / offline STT. */
export function resolveSpeechRecognitionLang(
  pref: SpeechInputLang = 'auto',
): string {
  if (pref === 'ja-JP') return 'ja-JP'
  if (pref === 'en-US') return 'en-US'
  if (pref === 'nl-NL') return 'nl-NL'

  // Auto: Japanese-first — learners speak Japanese and romaji, not the phone UI language.
  const nav = (navigator.language || '').toLowerCase()
  if (nav.startsWith('nl')) return 'nl-NL'
  return 'ja-JP'
}

export function speechLangDisplayName(bcp47: string): string {
  if (bcp47.startsWith('ja')) return 'Japanese (日本語)'
  if (bcp47.startsWith('nl')) return 'Dutch'
  if (bcp47.startsWith('en')) return 'English'
  return bcp47
}
