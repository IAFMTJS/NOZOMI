import { describe, expect, it } from 'vitest'
import {
  buildLexiconIndex,
  searchLexiconForTopic,
} from '@/systems/lexicon/lexiconIndex'
import { mergeSentencePools } from './lexiconPool'
import type { VocabEntry } from '@/types/domain'

const ticketEntry: VocabEntry = {
  id: 1002,
  jp: '切符',
  hiragana: 'きっぷ',
  kanji: '切符',
  romaji: 'kippu',
  en: 'ticket',
  category: 'general',
  jlptLevel: 'N5',
}

describe('lexicon conversation bridge', () => {
  it('indexes and finds topic-related lexicon entries', () => {
    buildLexiconIndex([ticketEntry])
    const hits = searchLexiconForTopic('train_station', 'N5', 5)
    expect(hits.some((h) => h.jp.includes('切符'))).toBe(true)
  })

  it('mergeSentencePools dedupes by japanese text', () => {
    const a = [
      {
        id: 1,
        jp: 'こんにちは',
        romaji: 'konnichiwa',
        en: 'hello',
        category: 'greeting',
        jlptLevel: 'N5' as const,
      },
    ]
    const b = [
      ...a,
      {
        id: 2,
        jp: '切符を二枚ください。',
        romaji: 'Kippu wo nimai kudasai.',
        en: 'Two tickets, please.',
        category: 'train_station',
        jlptLevel: 'N5' as const,
      },
    ]
    const merged = mergeSentencePools(a, b)
    expect(merged).toHaveLength(2)
  })
})
