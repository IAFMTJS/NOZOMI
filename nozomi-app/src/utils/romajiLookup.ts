import { db } from '@/database/db'
import { isKana, toRomaji } from 'wanakana'

const HAS_JP = /[\u3040-\u30ff\u4e00-\u9faf]/

/** Look up romaji from IndexedDB; fall back to wanakana for kana-only input. */
export async function lookupRomajiForJapanese(jp: string): Promise<string> {
  const clean = jp.trim()
  if (!clean || !HAS_JP.test(clean)) return ''

  const sentence = await db.sentences.filter((s) => s.jp === clean).first()
  if (sentence?.romaji?.trim()) return sentence.romaji.trim()

  const vocab = await db.vocabulary
    .filter(
      (v) =>
        v.jp === clean ||
        v.hiragana === clean ||
        v.kanji === clean,
    )
    .first()
  if (vocab?.romaji?.trim()) return vocab.romaji.trim()

  const line = await db.personalityLines.filter((l) => l.jp === clean).first()
  if (line?.romaji?.trim()) return line.romaji.trim()

  const beat = await db.storyBeats.filter((b) => b.jp === clean).first()
  if (beat?.romaji?.trim()) return beat.romaji.trim()

  if (isKana(clean)) {
    return toRomaji(clean)
  }

  return ''
}

export function hasJapanese(text: string): boolean {
  return HAS_JP.test(text)
}
