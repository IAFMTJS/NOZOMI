import { db } from './db'
import { SEED_PERSONALITY, SEED_SENTENCES, SEED_VOCAB } from './seedData'
import {
  buildLexiconIndex,
  isLexiconLoaded,
  lookupLexiconSurface,
  resetLexiconIndex,
} from '@/systems/lexicon/lexiconIndex'
import type {
  GrammarPattern,
  PersonalityLine,
  PersonalityMode,
  Sentence,
  Story,
  StoryBeat,
  VocabEntry,
} from '@/types/domain'

const DATA_VERSION_KEY = 'dataVersion'
const CURRENT_DATA_VERSION = '6'

let extendedLoaded = false
let lexiconLoadPromise: Promise<void> | null = null

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function dbMissingRomaji(): Promise<boolean> {
  const count = await db.sentences.count()
  if (count === 0) return true
  const sample = await db.sentences.orderBy('id').limit(40).toArray()
  const missing = sample.filter((s) => s.jp?.trim() && !s.romaji?.trim()).length
  return missing > 0
}

export async function ensureDataLoaded(): Promise<void> {
  const existing = await db.meta.get(DATA_VERSION_KEY)
  const versionOk = existing?.value === CURRENT_DATA_VERSION
  if (versionOk && !(await dbMissingRomaji())) {
    const count = await db.sentences.count()
    if (count > 0) return
  }

  let sentences = SEED_SENTENCES
  let vocabulary = SEED_VOCAB
  let personalityLines = SEED_PERSONALITY

  const sBundle = await fetchJson<{ sentences: Sentence[] }>('/data/sentences.json')
  const vBundle = await fetchJson<{ vocabulary: VocabEntry[] }>(
    '/data/vocabulary.json',
  )
  const pBundle = await fetchJson<{ lines: PersonalityLine[] }>(
    '/data/personality.json',
  )
  if (sBundle?.sentences?.length) sentences = sBundle.sentences
  if (vBundle?.vocabulary?.length) vocabulary = vBundle.vocabulary
  if (pBundle?.lines?.length) {
    const complete = pBundle.lines.filter(
      (l) => l.jp?.trim() && l.romaji?.trim(),
    )
    if (complete.length) personalityLines = complete
  }

  await db.transaction(
    'rw',
    db.sentences,
    db.vocabulary,
    db.personalityLines,
    db.meta,
    async () => {
      await db.sentences.clear()
      await db.vocabulary.clear()
      await db.personalityLines.clear()
      await db.sentences.bulkPut(sentences)
      await db.vocabulary.bulkPut(vocabulary)
      await db.personalityLines.bulkPut(personalityLines)
      await db.meta.put({ key: DATA_VERSION_KEY, value: CURRENT_DATA_VERSION })
    },
  )

  extendedLoaded = false
  resetLexiconIndex()
  lexiconLoadPromise = null
}

/** Lazy-load stories, grammar, extra personality from JSON */
export async function ensureExtendedDataLoaded(): Promise<void> {
  if (extendedLoaded) return

  const pBundle = await fetchJson<{ lines: PersonalityLine[] }>(
    '/data/personality.json',
  )
  const gBundle = await fetchJson<{ patterns: GrammarPattern[] }>(
    '/data/grammar.json',
  )
  const stBundle = await fetchJson<{ stories: Story[] }>('/data/stories.json')
  const bBundle = await fetchJson<{ beats: StoryBeat[] }>(
    '/data/story-beats.json',
  )

  await db.transaction(
    'rw',
    db.personalityLines,
    db.grammarPatterns,
    db.stories,
    db.storyBeats,
    async () => {
      if (pBundle?.lines?.length) {
        const lines = pBundle.lines.filter(
          (l) => l.jp?.trim() && l.romaji?.trim(),
        )
        await db.personalityLines.clear()
        await db.personalityLines.bulkPut(lines.length ? lines : pBundle.lines)
      }
      if (gBundle?.patterns?.length) {
        await db.grammarPatterns.clear()
        await db.grammarPatterns.bulkPut(gBundle.patterns)
      }
      if (stBundle?.stories?.length) {
        await db.stories.clear()
        await db.stories.bulkPut(stBundle.stories)
      }
      if (bBundle?.beats?.length) {
        await db.storyBeats.clear()
        await db.storyBeats.bulkPut(bBundle.beats)
      }
    },
  )

  extendedLoaded = true
}

/** Load merged lexicon (vocab + particles + verbs) for fast tap lookup */
export async function ensureLexiconLoaded(): Promise<void> {
  if (isLexiconLoaded()) return
  if (lexiconLoadPromise) return lexiconLoadPromise

  lexiconLoadPromise = (async () => {
    const bundle = await fetchJson<{ entries: VocabEntry[] }>('/data/lexicon.json')
    if (bundle?.entries?.length) {
      buildLexiconIndex(bundle.entries)
      return
    }
    const vocab = await db.vocabulary.toArray()
    buildLexiconIndex(vocab)
  })()

  return lexiconLoadPromise
}

export async function getSentencesByFilter(opts: {
  category?: string
  jlptLevel?: string
  limit?: number
}): Promise<Sentence[]> {
  let collection = db.sentences.toCollection()
  if (opts.category) {
    collection = db.sentences.where('category').equals(opts.category)
  }
  const all = await collection.toArray()
  let filtered = all
  if (opts.jlptLevel) {
    filtered = filtered.filter((s) => s.jlptLevel === opts.jlptLevel)
  }
  const limit = opts.limit ?? 50
  const conversational = filtered.filter(
    (s) => s.jp.length <= 52 && !/^(彼は|彼女は|彼ら)/.test(s.jp.trim()),
  )
  const source =
    conversational.length >= Math.min(8, limit)
      ? conversational
      : filtered
  const shuffled = [...source].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, limit)
}

export async function getRandomSentences(
  count: number,
  jlptLevel?: string,
): Promise<Sentence[]> {
  const all = await db.sentences.toArray()
  const pool = jlptLevel
    ? all.filter((s) => s.jlptLevel === jlptLevel)
    : all
  if (pool.length === 0) return SEED_SENTENCES.slice(0, count)
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export async function getVocabById(id: number): Promise<VocabEntry | undefined> {
  return db.vocabulary.get(id)
}

/** Find best vocab match for a tapped word or phrase. */
export async function lookupVocabBySurface(
  surface: string,
): Promise<VocabEntry | undefined> {
  const clean = surface.trim()
  if (!clean || clean.length < 1) return undefined

  await ensureLexiconLoaded()
  const fromLexicon = lookupLexiconSurface(clean)
  if (fromLexicon) return fromLexicon

  const exact = await db.vocabulary
    .filter(
      (v) =>
        v.jp === clean ||
        v.hiragana === clean ||
        v.kanji === clean ||
        v.romaji.toLowerCase() === clean.toLowerCase(),
    )
    .first()
  if (exact) return exact

  const all = await db.vocabulary.toArray()
  const matches = all.filter(
    (v) =>
      clean.includes(v.jp) ||
      v.jp.includes(clean) ||
      (v.kanji && (clean.includes(v.kanji) || v.kanji.includes(clean))) ||
      (v.hiragana && (clean.includes(v.hiragana) || v.hiragana.includes(clean))),
  )
  if (!matches.length) return undefined
  matches.sort((a, b) => b.jp.length - a.jp.length)
  return matches[0]
}

export async function getRelatedVocab(
  category: string,
  excludeId: number,
  limit = 3,
): Promise<VocabEntry[]> {
  const items = await db.vocabulary
    .where('category')
    .equals(category)
    .filter((v) => v.id !== excludeId)
    .limit(limit)
    .toArray()
  return items
}

const MODE_DB_MAP: Record<PersonalityMode, string[]> = {
  calm: ['calm', 'supportive'],
  supportive: ['supportive', 'calm', 'teacher'],
  playful: ['playful', 'casual_friend', 'calm'],
  teasing: ['playful', 'casual_friend', 'teasing'],
  philosophical: ['philosophical', 'calm', 'teacher'],
  teacher: ['teacher', 'strict_tutor', 'supportive'],
  casual_friend: ['casual_friend', 'playful', 'calm'],
  strict_tutor: ['strict_tutor', 'teacher'],
}

export async function getPersonalityLines(
  mode: PersonalityMode,
  context?: string,
  limit = 12,
): Promise<PersonalityLine[]> {
  await ensureExtendedDataLoaded()
  const modes = MODE_DB_MAP[mode] ?? ['calm']
  const all = await db.personalityLines.toArray()
  const matched = all.filter((line) => modes.includes(line.mode))
  const pool = matched.length ? matched : all
  const filtered = context
    ? pool.filter(
        (l) => l.context === context || l.context === 'general' || !l.context,
      )
    : pool
  const shuffled = [...(filtered.length ? filtered : pool)].sort(
    () => Math.random() - 0.5,
  )
  return shuffled.slice(0, limit)
}

export async function getStoryByCategory(
  category: string,
): Promise<Story | undefined> {
  await ensureExtendedDataLoaded()
  const stories = await db.stories
    .filter((s) => s.category === category || s.genre === category)
    .limit(5)
    .toArray()
  if (!stories.length) return undefined
  return stories[Math.floor(Math.random() * stories.length)]
}

export async function getFirstBeatForStory(
  storyId: number,
): Promise<StoryBeat | undefined> {
  return getBeatAtOrder(storyId, 1)
}

export async function getStoryById(
  storyId: number,
): Promise<Story | undefined> {
  await ensureExtendedDataLoaded()
  return db.stories.get(storyId)
}

export async function getBeatsForStory(storyId: number): Promise<StoryBeat[]> {
  await ensureExtendedDataLoaded()
  const beats = await db.storyBeats
    .where('storyId')
    .equals(storyId)
    .toArray()
  return beats.sort((a, b) => a.beatOrder - b.beatOrder)
}

export async function getBeatAtOrder(
  storyId: number,
  beatOrder: number,
): Promise<StoryBeat | undefined> {
  await ensureExtendedDataLoaded()
  const beats = await db.storyBeats
    .where('storyId')
    .equals(storyId)
    .filter((b) => b.beatOrder === beatOrder)
    .toArray()
  return beats[0]
}

export async function findGrammarForTags(
  tags: string | undefined,
  limit = 2,
): Promise<GrammarPattern[]> {
  if (!tags?.trim()) return []
  await ensureExtendedDataLoaded()
  const all = await db.grammarPatterns.toArray()
  const tokens = tags
    .split(/[,;|]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
  if (!tokens.length) return []

  const matched = all.filter((g) => {
    const p = g.pattern.toLowerCase()
    const m = g.meaning.toLowerCase()
    return tokens.some((t) => p.includes(t) || m.includes(t) || t.includes(p))
  })
  return (matched.length ? matched : all.slice(0, limit)).slice(0, limit)
}
