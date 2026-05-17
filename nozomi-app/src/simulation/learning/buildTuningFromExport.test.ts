import { describe, expect, it } from 'vitest'
import { SIMULATION_TUNING } from '@/data/simulation-tuning'
import {
  setConversationTuning,
  tuningPenaltyForSentence,
} from '@/systems/conversation/matching'
import { buildTuningFromConversations } from './buildTuningFromExport'
import type { SimulatedConversation } from '../types'

const baseScores = {
  overall: 0.5,
  immersion: 0.5,
  engagement: 0.5,
  japaneseCorrectness: 0.5,
  continuationQuality: 0.5,
  suggestionQuality: 0.5,
  tutoringQuality: 0.5,
  retentionRisk: 0.2,
}

function mockConv(overrides: Partial<SimulatedConversation>): SimulatedConversation {
  return {
    id: 'c1',
    runId: 'r1',
    user: { id: 'u1' } as SimulatedConversation['user'],
    turns: [],
    context: [],
    scores: baseScores,
    failures: [],
    metadata: {
      turnCount: 0,
      topics: [],
      intents: [],
      nozomiSentenceIds: [],
      endedReason: 'max_turns',
      durationMs: 0,
    },
    createdAt: Date.now(),
    ...overrides,
  }
}

describe('buildTuningFromConversations', () => {
  it('flags overused nozomi lines', () => {
    const turns = Array.from({ length: 12 }, (_, i) => [
      {
        turnIndex: i * 2,
        role: 'user' as const,
        text: `msg ${i}`,
        responseMs: 0,
        timestamp: i,
      },
      {
        turnIndex: i * 2 + 1,
        role: 'nozomi' as const,
        text: 'こんにちは！',
        detectedTopic: 'daily',
        responseMs: 0,
        timestamp: i,
      },
    ]).flat()

    const tuning = buildTuningFromConversations([
      mockConv({
        turns,
        scores: { ...baseScores, overall: 0.4, engagement: 0.4, continuationQuality: 0.4 },
      }),
    ])

    expect(tuning.avoidJpContains.some((s) => s.includes('こんにちは'))).toBe(true)
  })

  it('applies penalties via conversationTuning', () => {
    setConversationTuning({
      ...SIMULATION_TUNING,
      avoidJpContains: ['こんにちは！'],
    })
    expect(tuningPenaltyForSentence('こんにちは！元気？')).toBeLessThan(0)
    expect(tuningPenaltyForSentence('今日は忙しかった。')).toBe(0)
  })
})
