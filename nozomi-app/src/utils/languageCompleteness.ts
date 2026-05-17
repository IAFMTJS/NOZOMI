import type { LanguageText, Sentence } from '@/types/domain'

export function hasTrilingualFields(
  text: Partial<LanguageText>,
): boolean {
  return Boolean(
    text.jp?.trim() && text.romaji?.trim() && text.en?.trim(),
  )
}

/** Prefer sentences that include jp, romaji, and English. */
export function preferTrilingual<T extends Sentence>(pool: T[]): T[] {
  const complete = pool.filter(hasTrilingualFields)
  return complete.length >= 3 ? complete : pool
}
