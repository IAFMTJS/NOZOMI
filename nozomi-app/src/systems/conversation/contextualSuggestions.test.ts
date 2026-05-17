import { describe, expect, it } from 'vitest'
import {
  buildContextualSuggestions,
  detectSuggestionInvite,
} from './contextualSuggestions'

describe('detectSuggestionInvite', () => {
  it('detects why-questions from Nozomi', () => {
    expect(
      detectSuggestionInvite(
        { jp: 'どうして？', romaji: 'Doushite?', en: 'Why?' },
        'bad day',
      ),
    ).toBe('explain_why')
  })

  it('infers why after user said they had a tough day', () => {
    expect(
      detectSuggestionInvite(
        { jp: 'そうなんだ。', romaji: 'Sou nan da.', en: 'I see.' },
        'I had a bad day',
      ),
    ).toBe('explain_why')
  })

  it('prefers scenario replies at a station', async () => {
    const suggestions = await buildContextualSuggestions({
      topic: 'train_station',
      level: 'N5',
      nozomiMessage: {
        jp: 'どうして？',
        romaji: 'Doushite?',
        en: 'Why?',
      },
      recentUserText: 'missed the train',
      count: 3,
    })
    expect(
      suggestions.some((s) => /切符|電車|乗り換|ホーム/.test(s.jp)),
    ).toBe(true)
  })
})

describe('buildContextualSuggestions', () => {
  it('offers reason-style replies when Nozomi asks why', async () => {
    const suggestions = await buildContextualSuggestions({
      topic: 'daily',
      level: 'N5',
      nozomiMessage: {
        jp: 'どうして？大変だったの？',
        romaji: 'Doushite? Taihen datta no?',
        en: 'Why? Was it tough?',
      },
      recentUserText: 'bad day',
      count: 3,
    })
    expect(suggestions.length).toBeGreaterThanOrEqual(2)
    expect(
      suggestions.some((s) =>
        /school|friend|work|tired|sleep|test|busy|fight|home/i.test(s.en),
      ),
    ).toBe(true)
  })
})
