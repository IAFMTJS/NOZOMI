import { describe, expect, it } from 'vitest'
import { generateFakeUser } from './user/fakeUserGenerator'
import { generateUserUtterance } from './user/utteranceGenerator'
import { mulberry32 } from './utils/random'
import { analyzeSuggestions } from './suggestions/suggestionAnalyzer'
import { detectTurnFailures } from './failure/failureDetector'
import { scoreJapaneseCorrectness } from './evaluation/scorers'
import { conversationToDatasetRecord } from './dataset/datasetGenerator'
import type { SimulatedConversation } from './types'

describe('fake user generator', () => {
  it('creates users with configurable traits', () => {
    const rng = mulberry32(42)
    const user = generateFakeUser(rng, { personalityId: 'shy_speaker', jlptLevel: 'N5' })
    expect(user.profile.jlptLevel).toBe('N5')
    expect(user.traits.shortReplyBias).toBeGreaterThan(0.5)
    expect(user.emotion.primary).toBeDefined()
  })
})

describe('utterance generator', () => {
  it('produces non-empty utterances', () => {
    const rng = mulberry32(7)
    const user = generateFakeUser(rng)
    const text = generateUserUtterance(user, rng, { turnIndex: 1, opening: false })
    expect(text.trim().length).toBeGreaterThan(0)
  })
})

describe('suggestion analyzer', () => {
  it('penalizes duplicate suggestions', () => {
    const analysis = analyzeSuggestions({
      message: { jp: 'こんにちは', romaji: 'konnichiwa', en: 'hello' },
      suggestions: [
        { jp: '元気？', romaji: 'genki', en: 'how are you' },
        { jp: '元気？', romaji: 'genki', en: 'how are you' },
      ],
    })
    expect(analysis.duplicates).toBe(1)
    expect(analysis.score).toBeLessThan(0.6)
  })
})

describe('failure detector', () => {
  it('flags repetition', () => {
    const rng = mulberry32(1)
    const user = generateFakeUser(rng)
    const response = {
      message: { jp: 'そうですね', romaji: 'sou desu ne', en: 'I see' },
      suggestions: [],
      intent: 'statement' as const,
    }
    const failures = detectTurnFailures(
      2,
      user,
      'うん',
      response,
      {
        immersion: 0.5,
        engagement: 0.5,
        japaneseCorrectness: 0.5,
        continuationQuality: 0.5,
        suggestionQuality: 0.5,
      },
      ['そうですね'],
    )
    expect(failures.some((f) => f.kind === 'repetition')).toBe(true)
  })
})

describe('scorers', () => {
  it('rewards trilingual responses', () => {
    const score = scoreJapaneseCorrectness({
      message: { jp: '元気？', romaji: 'genki?', en: 'How are you?' },
      suggestions: [],
    })
    expect(score).toBeGreaterThan(0.7)
  })
})

describe('dataset generator', () => {
  it('pairs user and nozomi turns', () => {
    const conv: SimulatedConversation = {
      id: 'c1',
      runId: 'r1',
      user: generateFakeUser(mulberry32(3)),
      turns: [
        {
          turnIndex: 0,
          role: 'user',
          text: 'こんにちは',
          responseMs: 0,
          timestamp: 1,
        },
        {
          turnIndex: 1,
          role: 'nozomi',
          text: '元気？',
          responseMs: 10,
          timestamp: 2,
        },
      ],
      context: [],
      scores: {
        overall: 0.5,
        immersion: 0.5,
        engagement: 0.5,
        japaneseCorrectness: 0.5,
        continuationQuality: 0.5,
        suggestionQuality: 0.5,
        tutoringQuality: 0.5,
        retentionRisk: 0.2,
      },
      failures: [],
      metadata: {
        turnCount: 2,
        topics: [],
        intents: [],
        nozomiSentenceIds: [],
        endedReason: 'max_turns',
        durationMs: 100,
      },
      createdAt: Date.now(),
    }
    const record = conversationToDatasetRecord(conv)
    expect(record.turns).toHaveLength(1)
    expect(record.turns[0]?.user).toBe('こんにちは')
    expect(record.turns[0]?.nozomi).toBe('元気？')
  })
})
