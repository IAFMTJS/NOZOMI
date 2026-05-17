import type { LanguageText } from '@/types/domain'
import { hasJapanese, lookupRomajiForJapanese } from '@/utils/romajiLookup'

/** Format user-typed content for display in chat bubbles */
export function formatUserMessageText(raw: string): LanguageText {
  const input = raw.trim()
  if (!input) {
    return { jp: '…', romaji: '', en: '' }
  }

  if (hasJapanese(input)) {
    return {
      jp: input,
      romaji: '',
      en: '',
    }
  }

  return {
    jp: input,
    romaji: '',
    en: input,
  }
}

/** Async variant that resolves romaji from the local database when possible. */
export async function formatUserMessageTextAsync(
  raw: string,
): Promise<LanguageText> {
  const base = formatUserMessageText(raw)
  if (!base.jp || base.en) return base
  const romaji = await lookupRomajiForJapanese(base.jp)
  return romaji ? { ...base, romaji } : base
}
