import { describe, expect, it, vi } from 'vitest'

const personalityHit = {
  jp: '一度声に出して読んでみて。',
  romaji: 'ichido koe ni dashite yonde mite.',
  en: 'Try reading it aloud once.',
}

vi.mock('@/database/db', () => ({
  db: {
    sentences: { filter: () => ({ first: async () => undefined }) },
    vocabulary: { filter: () => ({ first: async () => undefined }) },
    personalityLines: {
      filter: (fn: (l: typeof personalityHit) => boolean) => ({
        first: async () => (fn(personalityHit) ? personalityHit : undefined),
      }),
    },
    storyBeats: { filter: () => ({ first: async () => undefined }) },
  },
}))

vi.mock('@/database/importService', () => ({
  ensureLexiconLoaded: async () => {},
}))

vi.mock('@/systems/lexicon/lexiconIndex', () => ({
  isLexiconLoaded: () => false,
  lookupLexiconSurface: () => undefined,
}))

import {
  lookupLanguageForJapanese,
  lookupRomajiForJapanese,
  splitJapaneseSegments,
} from './romajiLookup'

describe('splitJapaneseSegments', () => {
  it('splits on newlines and sentence endings', () => {
    expect(
      splitJapaneseSegments('一度声に出して読んでみて。\n有り難う、どうぞ頼みます'),
    ).toEqual(['一度声に出して読んでみて。', '有り難う、どうぞ頼みます'])
  })
})

describe('lookupLanguageForJapanese', () => {
  it('derives romaji from kana when punctuation is present', async () => {
    const { romaji } = await lookupLanguageForJapanese('どうもやらさい？')
    expect(romaji).toBe('doumoyarasai')
  })

  it('resolves each line of multi-line text', async () => {
    const { romaji, en } = await lookupLanguageForJapanese(
      '一度声に出して読んでみて。\n有り難う、どうぞ頼みます',
    )
    expect(romaji).toContain('ichido koe ni dashite yonde mite')
    expect(en).toContain('Try reading it aloud once')
  })

  it('lookupRomajiForJapanese delegates to language lookup', async () => {
    const romaji = await lookupRomajiForJapanese('こんにちは')
    expect(romaji).toMatch(/^konnichi/)
  })
})
