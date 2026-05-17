import { ensureLexiconLoaded } from '@/database/importService'
import { db } from '@/database/db'
import {
  isLexiconLoaded,
  lookupLexiconSurface,
} from '@/systems/lexicon/lexiconIndex'
import { isJapaneseToken, tokenizeJapanese } from '@/utils/japaneseTokens'
import { isKana, toRomaji } from 'wanakana'

const HAS_JP = /[\u3040-\u30ff\u4e00-\u9faf]/

function kanaRomajiFallback(text: string): string {
  const core = text.replace(/[^\u3040-\u30ff\u4e00-\u9fafー々〆ヵヶ]/g, '')
  if (core && isKana(core)) return toRomaji(core)
  return ''
}

function fromRecord(record?: { romaji?: string; en?: string }): {
  romaji: string
  en: string
} {
  return {
    romaji: record?.romaji?.trim() || '',
    en: record?.en?.trim() || '',
  }
}

/** Split on newlines and Japanese sentence endings. */
export function splitJapaneseSegments(text: string): string[] {
  const segments: string[] = []
  for (const line of text.split(/\n+/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const parts = trimmed.match(/[^。！？!?]+[。！？!?]?/gu) ?? [trimmed]
    for (const part of parts) {
      const segment = part.trim()
      if (segment) segments.push(segment)
    }
  }
  return segments.length ? segments : [text.trim()]
}

function joinSegmentResults(
  original: string,
  segments: string[],
  values: string[],
): string {
  const parts = values.map((v) => v.trim()).filter(Boolean)
  if (!parts.length) return ''
  if (original.includes('\n') && segments.length > 1) {
    return parts.join('\n')
  }
  return parts.join(' ')
}

function romajiFromLexicon(text: string): string {
  if (!isLexiconLoaded()) return kanaRomajiFallback(text)
  const parts: string[] = []
  for (const token of tokenizeJapanese(text)) {
    if (!isJapaneseToken(token)) continue
    const entry = lookupLexiconSurface(token)
    if (entry?.romaji?.trim()) {
      parts.push(entry.romaji.trim())
    } else if (entry?.hiragana?.trim() && isKana(entry.hiragana)) {
      parts.push(toRomaji(entry.hiragana))
    } else if (isKana(token)) {
      parts.push(toRomaji(token))
    }
  }
  return parts.join(' ').trim() || kanaRomajiFallback(text)
}

function englishFromLexicon(text: string): string {
  if (!isLexiconLoaded()) return ''
  const glosses: string[] = []
  const seen = new Set<string>()
  for (const token of tokenizeJapanese(text)) {
    if (!isJapaneseToken(token)) continue
    const entry = lookupLexiconSurface(token)
    const gloss = entry?.en?.split(/[,;]/)[0]?.trim()
    if (!gloss || seen.has(gloss)) continue
    seen.add(gloss)
    glosses.push(gloss)
  }
  return glosses.join('; ')
}

async function lookupSingleSegment(segment: string): Promise<{
  romaji: string
  en: string
}> {
  const clean = segment.trim()
  if (!clean || !HAS_JP.test(clean)) return { romaji: '', en: '' }

  const sentence = await db.sentences.filter((s) => s.jp === clean).first()
  if (sentence) {
    const hit = fromRecord(sentence)
    if (hit.romaji || hit.en) return hit
  }

  const vocab = await db.vocabulary
    .filter(
      (v) =>
        v.jp === clean ||
        v.hiragana === clean ||
        v.kanji === clean,
    )
    .first()
  if (vocab) {
    const hit = fromRecord(vocab)
    if (hit.romaji || hit.en) return hit
  }

  const line = await db.personalityLines.filter((l) => l.jp === clean).first()
  if (line) {
    const hit = fromRecord(line)
    if (hit.romaji || hit.en) return hit
  }

  const beat = await db.storyBeats.filter((b) => b.jp === clean).first()
  if (beat) {
    const hit = fromRecord(beat)
    if (hit.romaji || hit.en) return hit
  }

  return {
    romaji: romajiFromLexicon(clean),
    en: englishFromLexicon(clean),
  }
}

async function augmentSegment(segment: string, partial: {
  romaji: string
  en: string
}): Promise<{ romaji: string; en: string }> {
  const romaji = partial.romaji || kanaRomajiFallback(segment)
  const en = partial.en
  if (romaji && en) return { romaji, en }
  if (isLexiconLoaded()) {
    return {
      romaji: romaji || romajiFromLexicon(segment),
      en: en || englishFromLexicon(segment),
    }
  }
  void ensureLexiconLoaded().catch(() => {})
  return { romaji, en }
}

/** Look up romaji and English from IndexedDB; supports multi-line / multi-sentence text. */
export async function lookupLanguageForJapanese(jp: string): Promise<{
  romaji: string
  en: string
}> {
  const clean = jp.trim()
  if (!clean || !HAS_JP.test(clean)) return { romaji: '', en: '' }

  const segments = splitJapaneseSegments(clean)
  if (segments.length === 1) {
    const hit = await lookupSingleSegment(segments[0]!)
    return augmentSegment(segments[0]!, hit)
  }

  const hits = await Promise.all(
    segments.map(async (segment) => augmentSegment(segment, await lookupSingleSegment(segment))),
  )
  return {
    romaji: joinSegmentResults(clean, segments, hits.map((h) => h.romaji)),
    en: joinSegmentResults(clean, segments, hits.map((h) => h.en)),
  }
}

/** Look up romaji from IndexedDB; fall back to wanakana for kana-only input. */
export async function lookupRomajiForJapanese(jp: string): Promise<string> {
  const { romaji } = await lookupLanguageForJapanese(jp)
  return romaji
}

export function hasJapanese(text: string): boolean {
  return HAS_JP.test(text)
}
