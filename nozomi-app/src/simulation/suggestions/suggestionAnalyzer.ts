import type { EngineResponse } from '@/types/domain'
import { hasTrilingualFields } from '@/utils/languageCompleteness'

export interface SuggestionAnalysis {
  score: number
  count: number
  duplicates: number
  incomplete: number
  overlapsNozomi: boolean
  avgLength: number
}

export function analyzeSuggestions(
  response: EngineResponse,
  recentNozomi: string[] = [],
): SuggestionAnalysis {
  const suggestions = response.suggestions ?? []
  if (!suggestions.length) {
    return {
      score: 0.2,
      count: 0,
      duplicates: 0,
      incomplete: 0,
      overlapsNozomi: false,
      avgLength: 0,
    }
  }

  const jpSet = new Set<string>()
  let duplicates = 0
  let incomplete = 0
  let overlapsNozomi = false
  let totalLen = 0

  for (const s of suggestions) {
    if (jpSet.has(s.jp)) duplicates += 1
    jpSet.add(s.jp)
    if (!hasTrilingualFields(s)) incomplete += 1
    if (s.jp === response.message.jp) overlapsNozomi = true
    if (recentNozomi.includes(s.jp)) overlapsNozomi = true
    totalLen += s.jp.length
  }

  let score = 0.55
  score += Math.min(0.2, suggestions.length * 0.06)
  score -= duplicates * 0.12
  score -= incomplete * 0.1
  if (overlapsNozomi) score -= 0.2

  const diverse = jpSet.size === suggestions.length
  if (diverse) score += 0.1

  return {
    score: Math.min(1, Math.max(0, score)),
    count: suggestions.length,
    duplicates,
    incomplete,
    overlapsNozomi,
    avgLength: totalLen / suggestions.length,
  }
}

export function suggestionQualityForTurn(
  response: EngineResponse,
  recentNozomi: string[],
): number {
  return analyzeSuggestions(response, recentNozomi).score
}
