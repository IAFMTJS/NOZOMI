import { describe, expect, it, beforeEach } from 'vitest'
import {
  buildLexiconIndex,
  lookupLexiconSurface,
  resetLexiconIndex,
} from './lexiconIndex'

describe('lexiconIndex', () => {
  beforeEach(() => resetLexiconIndex())

  it('finds exact surface match', () => {
    buildLexiconIndex([
      {
        id: 1,
        jp: '楽しい',
        romaji: 'tanoshii',
        en: 'fun / enjoyable',
        hiragana: 'たのしい',
        kanji: '楽しい',
        category: 'emotion',
        jlptLevel: 'N5',
      },
    ])
    const hit = lookupLexiconSurface('楽しい')
    expect(hit?.en).toContain('fun')
  })

  it('finds particle by kana', () => {
    buildLexiconIndex([
      {
        id: 10001,
        jp: 'は',
        romaji: 'wa',
        en: 'topic marker',
        hiragana: 'は',
        category: 'particle',
        jlptLevel: 'N5',
        entryType: 'particle',
      },
    ])
    expect(lookupLexiconSurface('は')?.entryType).toBe('particle')
  })
})
