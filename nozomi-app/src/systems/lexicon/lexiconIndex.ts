import {
  isScenarioIntent,
  SCENARIO_TOPIC_KEYWORDS,
  type ScenarioIntent,
} from '@/data/scenarioIntents'
import { TOPIC_KEYWORDS } from '@/systems/conversation/nlu'
import { tokenizeJapanese, isJapaneseToken } from '@/utils/japaneseTokens'
import type { JlptLevel, LexiconEntryType, VocabEntry } from '@/types/domain'

type IndexedEntry = VocabEntry & { entryType?: LexiconEntryType }

const JLPT_ORDER: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

let entries: IndexedEntry[] = []
let surfaceMap = new Map<string, IndexedEntry>()
let loaded = false

function levelIndex(level: JlptLevel): number {
  return JLPT_ORDER.indexOf(level)
}

function topicPattern(topic: string): RegExp | null {
  if (isScenarioIntent(topic)) {
    return SCENARIO_TOPIC_KEYWORDS[topic as ScenarioIntent]
  }
  return TOPIC_KEYWORDS[topic] ?? null
}

function addSurface(key: string, entry: IndexedEntry): void {
  const k = key.trim()
  if (!k || k.length < 1) return
  const existing = surfaceMap.get(k)
  if (!existing || entry.jp.length > existing.jp.length) {
    surfaceMap.set(k, entry)
  }
}

function indexEntry(entry: IndexedEntry): void {
  addSurface(entry.jp, entry)
  if (entry.hiragana) addSurface(entry.hiragana, entry)
  if (entry.kanji) addSurface(entry.kanji, entry)
  if (entry.romaji) addSurface(entry.romaji.toLowerCase(), entry)
}

export function buildLexiconIndex(lexiconEntries: IndexedEntry[]): void {
  entries = lexiconEntries
  surfaceMap = new Map()
  for (const e of entries) indexEntry(e)
  loaded = true
}

export function isLexiconLoaded(): boolean {
  return loaded
}

export function lookupLexiconSurface(surface: string): VocabEntry | undefined {
  const clean = surface.trim()
  if (!clean) return undefined

  const exact =
    surfaceMap.get(clean) ?? surfaceMap.get(clean.toLowerCase())
  if (exact) return exact

  let best: IndexedEntry | undefined
  for (const e of entries) {
    const surfaces = [e.jp, e.hiragana, e.kanji].filter(Boolean) as string[]
    for (const s of surfaces) {
      if (clean.includes(s) || s.includes(clean)) {
        if (!best || s.length > best.jp.length) best = e
      }
    }
  }
  return best
}

/** JMdict / lexicon rows that match an active scenario or topic (for conversation pool). */
export function searchLexiconForTopic(
  topic: string,
  maxLevel: JlptLevel,
  limit: number,
): VocabEntry[] {
  if (!loaded || limit <= 0) return []

  const pattern = topicPattern(topic)
  const maxIdx = levelIndex(maxLevel)
  const scored: { entry: IndexedEntry; score: number }[] = []

  for (const entry of entries) {
    if (levelIndex(entry.jlptLevel) > maxIdx) continue
    const haystack = [
      entry.jp,
      entry.hiragana,
      entry.kanji ?? '',
      entry.en,
      entry.romaji,
    ].join(' ')

    let score = 0
    if (pattern?.test(haystack)) score += 6
    if (entry.category === topic) score += 4
    if (score > 0) scored.push({ entry, score })
  }

  scored.sort((a, b) => b.score - a.score)
  const seen = new Set<number>()
  const out: VocabEntry[] = []
  for (const { entry } of scored) {
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    out.push(entry)
    if (out.length >= limit) break
  }
  return out
}

export type LexiconMatchHints = {
  jpHints: string[]
  enHints: string[]
}

/** Token-level hints from JMdict for intent matcher scoring. */
export function lexiconHintsForInput(input: string): LexiconMatchHints {
  const jpHints = new Set<string>()
  const enHints = new Set<string>()
  if (!loaded || !input.trim()) {
    return { jpHints: [], enHints: [] }
  }

  const addEntry = (entry: VocabEntry | undefined) => {
    if (!entry) return
    if (entry.jp) jpHints.add(entry.jp)
    if (entry.hiragana) jpHints.add(entry.hiragana)
    if (entry.kanji) jpHints.add(entry.kanji)
    for (const word of entry.en.toLowerCase().split(/[^a-z]+/)) {
      if (word.length > 2) enHints.add(word)
    }
  }

  addEntry(lookupLexiconSurface(input))

  for (const token of tokenizeJapanese(input)) {
    const t = token.trim()
    if (!isJapaneseToken(t)) continue
    addEntry(lookupLexiconSurface(t))
  }

  for (const word of input.toLowerCase().split(/[^a-z]+/)) {
    if (word.length < 3) continue
    addEntry(lookupLexiconSurface(word))
  }

  return { jpHints: [...jpHints], enHints: [...enHints] }
}

export function resetLexiconIndex(): void {
  entries = []
  surfaceMap = new Map()
  loaded = false
}
