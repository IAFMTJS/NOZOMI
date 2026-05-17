import type { EngineResponse, JlptLevel } from '@/types/domain'
import { hasTrilingualFields } from '@/utils/languageCompleteness'
import type { EmotionalState, TurnScores } from '../types'

const JLPT_ORDER: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

function levelIdx(l: JlptLevel): number {
  return JLPT_ORDER.indexOf(l)
}

const FALLBACK_JP = new Set([
  'そうですね。もう少し教えてください。',
  'うん、そうだね。',
  'また話そうね。',
])

export function scoreImmersion(response: EngineResponse): number {
  let score = 0.5
  if (hasTrilingualFields(response.message)) score += 0.25
  if (response.message.jp.trim().length >= 4) score += 0.1
  if (response.sentenceId) score += 0.1
  if (response.grammarTags?.trim()) score += 0.05
  return Math.min(1, score)
}

export function scoreEngagement(
  response: EngineResponse,
  userEmotion: EmotionalState,
): number {
  let score = 0.45
  const len = response.message.jp.length
  if (len >= 8 && len <= 48) score += 0.2
  if (response.suggestions.length >= 2) score += 0.15
  if (response.message.jp.includes('？') || response.message.jp.includes('?')) score += 0.1
  score += userEmotion.engagement * 0.15
  return Math.min(1, Math.max(0, score))
}

export function scoreJapaneseCorrectness(response: EngineResponse): number {
  const jp = response.message.jp
  let score = 0.4
  if (/[\u3040-\u9fff\u30a0-\u30ff]/.test(jp)) score += 0.35
  if (response.message.romaji?.trim()) score += 0.15
  if (response.message.en?.trim()) score += 0.1
  if (FALLBACK_JP.has(jp)) score -= 0.25
  return Math.min(1, Math.max(0, score))
}

export function scoreContinuation(
  response: EngineResponse,
  userInput: string,
  priorTopic?: string,
): number {
  let score = 0.5
  if (response.topic && priorTopic && response.topic === priorTopic) score += 0.15
  if (response.intent === 'question' && /[?？]/.test(userInput)) score += 0.1
  if (response.intent === 'greeting' && /こんにちは|hello|おはよう/i.test(userInput)) score += 0.15
  if (response.intent === 'help' && /help|教えて|わからない/i.test(userInput)) score += 0.2
  if (FALLBACK_JP.has(response.message.jp)) score -= 0.35
  return Math.min(1, Math.max(0, score))
}

export function scoreTurn(
  response: EngineResponse,
  userInput: string,
  userLevel: JlptLevel,
  userEmotion: EmotionalState,
  priorTopic?: string,
  suggestionScore = 0.5,
): TurnScores {
  return {
    immersion: scoreImmersion(response),
    engagement: scoreEngagement(response, userEmotion),
    japaneseCorrectness: scoreJapaneseCorrectness(response),
    continuationQuality: scoreContinuation(response, userInput, priorTopic),
    suggestionQuality: suggestionScore,
  }
}

export function averageScores(turns: TurnScores[]): TurnScores {
  if (!turns.length) {
    return {
      immersion: 0,
      engagement: 0,
      japaneseCorrectness: 0,
      continuationQuality: 0,
      suggestionQuality: 0,
    }
  }
  const sum = turns.reduce(
    (acc, t) => ({
      immersion: acc.immersion + t.immersion,
      engagement: acc.engagement + t.engagement,
      japaneseCorrectness: acc.japaneseCorrectness + t.japaneseCorrectness,
      continuationQuality: acc.continuationQuality + t.continuationQuality,
      suggestionQuality: acc.suggestionQuality + t.suggestionQuality,
    }),
    {
      immersion: 0,
      engagement: 0,
      japaneseCorrectness: 0,
      continuationQuality: 0,
      suggestionQuality: 0,
    },
  )
  const n = turns.length
  return {
    immersion: sum.immersion / n,
    engagement: sum.engagement / n,
    japaneseCorrectness: sum.japaneseCorrectness / n,
    continuationQuality: sum.continuationQuality / n,
    suggestionQuality: sum.suggestionQuality / n,
  }
}

export function levelAppropriateBonus(
  response: EngineResponse,
  userLevel: JlptLevel,
): number {
  if (!response.sentenceId) return 0
  return 0.05 * (5 - levelIdx(userLevel))
}
