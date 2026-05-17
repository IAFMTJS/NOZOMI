import type { EngineResponse } from '@/types/domain'
import type {
  ConversationScores,
  SimulatedUser,
  TurnLog,
  TurnScores,
} from '../types'
import { averageScores, scoreTurn } from './scorers'
import { suggestionQualityForTurn } from '../suggestions/suggestionAnalyzer'

export function evaluateTurn(
  user: SimulatedUser,
  userInput: string,
  response: EngineResponse,
  priorTopic?: string,
  recentNozomi: string[] = [],
): TurnScores {
  const suggestionScore = suggestionQualityForTurn(response, recentNozomi)
  return scoreTurn(
    response,
    userInput,
    user.profile.jlptLevel,
    user.emotion,
    priorTopic,
    suggestionScore,
  )
}

export function evaluateConversation(
  turns: TurnLog[],
  turnScoreList: TurnScores[],
  tutoringQuality: number,
): ConversationScores {
  const avg = averageScores(turnScoreList)
  const retentionRisk = computeRetentionRisk(turns)
  const overall =
    avg.immersion * 0.2 +
    avg.engagement * 0.2 +
    avg.japaneseCorrectness * 0.15 +
    avg.continuationQuality * 0.2 +
    avg.suggestionQuality * 0.1 +
    tutoringQuality * 0.1 -
    retentionRisk * 0.05

  return {
    overall: Math.min(1, Math.max(0, overall)),
    immersion: avg.immersion,
    engagement: avg.engagement,
    japaneseCorrectness: avg.japaneseCorrectness,
    continuationQuality: avg.continuationQuality,
    suggestionQuality: avg.suggestionQuality,
    tutoringQuality,
    retentionRisk,
  }
}

function computeRetentionRisk(turns: TurnLog[]): number {
  const emotions = turns
    .filter((t) => t.userEmotion)
    .map((t) => t.userEmotion!)
  if (!emotions.length) return 0.2
  const last = emotions.slice(-3)
  const avgBoredom = last.reduce((s, e) => s + e.boredom, 0) / last.length
  const avgEng = last.reduce((s, e) => s + e.engagement, 0) / last.length
  return Math.min(1, avgBoredom * 0.6 + (1 - avgEng) * 0.4)
}

export function computeTutoringQuality(turns: TurnLog[]): number {
  let helpRequests = 0
  let helpAddressed = 0
  let corrections = 0

  for (const t of turns) {
    if (t.role !== 'user') continue
    const input = t.input ?? t.text
    if (/help|教えて|わからない|meaning|translate/i.test(input)) {
      helpRequests += 1
      const next = turns.find(
        (n) => n.role === 'nozomi' && n.turnIndex > t.turnIndex,
      )
      if (
        next?.response?.intent === 'help' ||
        next?.response?.message.en.toLowerCase().includes('practice')
      ) {
        helpAddressed += 1
      }
    }
    if (t.detectedIntent === 'help') helpRequests += 0
    const nz = turns.find(
      (n) => n.role === 'nozomi' && n.turnIndex === t.turnIndex + 1,
    )
    if (nz?.response?.grammarTags) corrections += 1
  }

  if (!helpRequests) return corrections > 0 ? 0.7 : 0.55
  return Math.min(1, helpAddressed / helpRequests + (corrections > 0 ? 0.15 : 0))
}
