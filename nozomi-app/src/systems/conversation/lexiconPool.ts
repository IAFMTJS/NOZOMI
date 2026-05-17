import type { Intent } from './intent'
import { ensureLexiconLoaded } from '@/database/importService'
import {
  lexiconHintsForInput,
  lookupLexiconSurface,
  searchLexiconForTopic,
} from '@/systems/lexicon/lexiconIndex'
import type { JlptLevel, Sentence, VocabEntry } from '@/types/domain'

const LEXICON_SENTENCE_ID_BASE = 8_000_000
const COMPANION_MAX_JP = 48

function lexiconSentenceId(vocabId: number): number {
  return LEXICON_SENTENCE_ID_BASE + (vocabId % 1_000_000)
}

function vocabToSentence(
  entry: VocabEntry,
  topic: string,
  intent: Intent,
): Sentence | null {
  const exJp = entry.exampleJp?.trim()
  if (exJp && exJp.length <= COMPANION_MAX_JP) {
    return {
      id: lexiconSentenceId(entry.id),
      jp: exJp,
      romaji: (entry.exampleRomaji ?? entry.romaji).trim(),
      en: (entry.exampleEn ?? entry.en).trim(),
      category: topic,
      jlptLevel: entry.jlptLevel,
      source: 'lexicon',
    }
  }

  const head = (entry.kanji ?? entry.jp).trim()
  if (!head || head.length > 24) return null

  let jp: string
  let en: string
  if (intent === 'question' || intent === 'help') {
    jp = head.length <= 8 ? `${head}って何？` : `${head}のこと？`
    en = `About ${entry.en}?`
  } else if (intent === 'greeting') {
    // Greetings come from the sentence DB; lexicon stubs like "望み、こんにちは。" read unnatural.
    return null
  } else {
    jp = `「${head}」ですね。`
    en = `${entry.en}, right?`
  }

  if (jp.length > COMPANION_MAX_JP) return null

  return {
    id: lexiconSentenceId(entry.id),
    jp,
    romaji: entry.romaji.trim(),
    en: en.slice(0, 140),
    category: topic,
    jlptLevel: entry.jlptLevel,
    source: 'lexicon',
  }
}

function dedupeEntries(list: VocabEntry[]): VocabEntry[] {
  const seen = new Set<number>()
  const out: VocabEntry[] = []
  for (const e of list) {
    if (seen.has(e.id)) continue
    seen.add(e.id)
    out.push(e)
  }
  return out
}

/**
 * Turn JMdict lexicon hits into short companion-style lines for the intent matcher.
 */
export async function lexiconSentencesForConversation(
  topic: string,
  level: JlptLevel,
  input: string,
  intent: Intent,
  limit = 24,
): Promise<Sentence[]> {
  await ensureLexiconLoaded()

  const fromTopic = searchLexiconForTopic(topic, level, limit)
  const fromInput: VocabEntry[] = []

  const whole = lookupLexiconSurface(input)
  if (whole) fromInput.push(whole)

  for (const hint of lexiconHintsForInput(input).jpHints) {
    const e = lookupLexiconSurface(hint)
    if (e) fromInput.push(e)
  }

  const merged = dedupeEntries([...fromInput, ...fromTopic])
  const sentences: Sentence[] = []
  for (const entry of merged) {
    const sentence = vocabToSentence(entry, topic, intent)
    if (sentence) sentences.push(sentence)
    if (sentences.length >= limit) break
  }
  return sentences
}

export function mergeSentencePools(
  primary: Sentence[],
  extra: Sentence[],
): Sentence[] {
  const seen = new Set(primary.map((s) => s.jp))
  const out = [...primary]
  for (const s of extra) {
    if (seen.has(s.jp)) continue
    seen.add(s.jp)
    out.push(s)
  }
  return out
}
