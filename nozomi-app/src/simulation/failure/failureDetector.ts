import type { EngineResponse } from '@/types/domain'
import type {
  ConversationScores,
  SimulatedUser,
  TurnFailure,
  TurnLog,
  TurnScores,
} from '../types'

const FALLBACK_JP = [
  'そうですね。もう少し教えてください。',
  'うん、そうだね。',
]

function ngramOverlap(a: string, b: string, n = 3): number {
  if (a.length < n || b.length < n) return a === b ? 1 : 0
  const gramsA = new Set<string>()
  for (let i = 0; i <= a.length - n; i++) gramsA.add(a.slice(i, i + n))
  let hits = 0
  let total = 0
  for (let i = 0; i <= b.length - n; i++) {
    total += 1
    if (gramsA.has(b.slice(i, i + n))) hits += 1
  }
  return total ? hits / total : 0
}

export function detectTurnFailures(
  turnIndex: number,
  user: SimulatedUser,
  userInput: string,
  response: EngineResponse,
  scores: TurnScores,
  recentNozomiJp: string[],
): TurnFailure[] {
  const failures: TurnFailure[] = []

  if (FALLBACK_JP.includes(response.message.jp)) {
    failures.push({
      kind: 'dead_end',
      severity: 0.75,
      message: 'Nozomi returned generic fallback line',
      turnIndex,
    })
  }

  if (turnIndex > 1) {
  for (const prev of recentNozomiJp) {
    const overlap = ngramOverlap(prev, response.message.jp)
    if (overlap > 0.55 || prev === response.message.jp) {
      failures.push({
        kind: 'repetition',
        severity: Math.min(1, overlap + 0.2),
        message: 'Response repeats prior Nozomi line',
        turnIndex,
      })
      break
    }
  }
  }

  const emotion = user.emotion
  if (
    emotion.primary === 'confused' &&
    response.intent !== 'help' &&
    /わからない|教えて|help|meaning/i.test(userInput)
  ) {
    failures.push({
      kind: 'tutoring_failure',
      severity: 0.7,
      message: 'User asked for help but intent was not help',
      turnIndex,
    })
  }

  if (
    (emotion.primary === 'bored' || emotion.boredom > 0.6) &&
    scores.engagement < 0.4
  ) {
    failures.push({
      kind: 'emotional_mismatch',
      severity: 0.55 + emotion.boredom * 0.3,
      message: 'User bored but engagement score low',
      turnIndex,
    })
  }

  if (scores.continuationQuality < 0.35) {
    failures.push({
      kind: 'weak_continuation',
      severity: 0.5,
      message: 'Weak topic/intent continuation',
      turnIndex,
    })
  }

  if (scores.engagement < 0.3) {
    failures.push({
      kind: 'low_engagement',
      severity: 0.45,
      message: 'Low engagement on this turn',
      turnIndex,
    })
  }

  const tutorModes = ['teacher', 'strict_tutor'] as const
  if (
    tutorModes.includes(user.profile.personalityMode as (typeof tutorModes)[number]) &&
    user.goal === 'practice_grammar' &&
    !response.grammarTags &&
    /grammar|て形|particle|past tense/i.test(userInput)
  ) {
    failures.push({
      kind: 'tutoring_failure',
      severity: 0.5,
      message: 'Grammar practice without grammar tags in response',
      turnIndex,
    })
  }

  if (emotion.engagement < 0.25 && emotion.boredom > 0.5) {
    failures.push({
      kind: 'retention_risk',
      severity: 0.6 + emotion.boredom * 0.3,
      message: 'User likely to disengage',
      turnIndex,
    })
  }

  return failures
}

export function detectConversationFailures(
  turns: TurnLog[],
  scores: ConversationScores,
  user: SimulatedUser,
): TurnFailure[] {
  const all: TurnFailure[] = []
  const nozomiLines: string[] = []

  for (const t of turns) {
    if (t.role !== 'nozomi' || !t.response) continue
    const turnScores = {
      immersion: scores.immersion,
      engagement: scores.engagement,
      japaneseCorrectness: scores.japaneseCorrectness,
      continuationQuality: scores.continuationQuality,
      suggestionQuality: scores.suggestionQuality,
    }
    all.push(
      ...detectTurnFailures(
        t.turnIndex,
        { ...user, emotion: t.userEmotion ?? user.emotion },
        t.input ?? '',
        t.response,
        turnScores,
        nozomiLines,
      ),
    )
    nozomiLines.push(t.response.message.jp)
  }

  if (scores.overall < 0.35) {
    all.push({
      kind: 'dead_end',
      severity: 0.8,
      message: 'Conversation overall score critically low',
      turnIndex: turns.length - 1,
    })
  }

  return all
}
