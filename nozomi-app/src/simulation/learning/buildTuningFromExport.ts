import type { ConversationTuningData, TuningHintRule } from '@/data/simulation-tuning'
import type { SimulatedConversation } from '../types'

const SHORT_ACK = /^(うん|そう|へー|ok|yeah|mhm|まあ|…)$/i

export function buildTuningFromConversations(
  conversations: SimulatedConversation[],
): ConversationTuningData {
  const phraseUse = new Map<string, { count: number; lowScore: number }>()
  const highTurns: { user: string; nozomi: string; topic?: string }[] = []

  for (const conv of conversations) {
    const isLow = conv.scores.overall < 0.55
    let pendingUser: string | undefined
    let nozomiTurn = 0

    for (const t of conv.turns) {
      if (t.role === 'user') {
        pendingUser = t.text
      } else if (t.role === 'nozomi' && pendingUser !== undefined) {
        nozomiTurn += 1
        const jp = t.text.trim()
        if (jp.length >= 4) {
          const row = phraseUse.get(jp) ?? { count: 0, lowScore: 0 }
          row.count += 1
          if (isLow) row.lowScore += 1
          phraseUse.set(jp, row)
        }
        if (conv.scores.overall >= 0.78 && nozomiTurn > 1 && jp.length <= 48) {
          highTurns.push({
            user: pendingUser,
            nozomi: jp,
            topic: t.detectedTopic,
          })
        }
        pendingUser = undefined
      }
    }
  }

  const n = conversations.length
  const avoidJpContains: string[] = []
  for (const [phrase, row] of phraseUse.entries()) {
    if (row.count >= Math.max(8, n * 0.08)) avoidJpContains.push(phrase)
    if (row.lowScore >= 5 && row.count >= 4) avoidJpContains.push(phrase)
    if (/^「[^」]+」ですね/.test(phrase)) avoidJpContains.push('」ですね')
  }
  if (!avoidJpContains.includes('こんにちは！')) {
    const konnichi = phraseUse.get('こんにちは！')
    if (konnichi && konnichi.count >= n * 0.15) avoidJpContains.push('こんにちは！')
  }

  const hintRules = inferHintRules(highTurns)

  return {
    version: 2,
    avoidJpContains: [...new Set(avoidJpContains)].slice(0, 40),
    hintRules,
    questionOnShortAck: true,
  }
}

function inferHintRules(
  highTurns: { user: string; nozomi: string; topic?: string }[],
): TuningHintRule[] {
  const rules: TuningHintRule[] = []
  const buckets: { pattern: string; jpBoost: Set<string> }[] = [
    { pattern: '(わからない|教えて|help|meaning)', jpBoost: new Set() },
    { pattern: '(疲|忙|大変|tired|busy)', jpBoost: new Set() },
    { pattern: '(うん|そう|ok|yeah)$', jpBoost: new Set() },
    { pattern: '(楽し|嬉|happy|fun)', jpBoost: new Set() },
  ]

  for (const turn of highTurns.slice(0, 500)) {
    for (const bucket of buckets) {
      if (!new RegExp(bucket.pattern, 'i').test(turn.user)) continue
      for (const frag of extractJpFragments(turn.nozomi)) {
        bucket.jpBoost.add(frag)
      }
    }
    if (SHORT_ACK.test(turn.user.trim()) && /[?？]/.test(turn.nozomi)) {
      buckets[2]!.jpBoost.add(turn.nozomi.slice(0, 8))
    }
  }

  for (const b of buckets) {
    const jpBoost = [...b.jpBoost].filter((s) => s.length >= 2).slice(0, 8)
    if (jpBoost.length) rules.push({ pattern: b.pattern, jpBoost })
  }

  return rules
}

function extractJpFragments(jp: string): string[] {
  const frags: string[] = []
  if (/[?？]/.test(jp)) frags.push('？')
  const words = jp.match(/[\u3040-\u9fff\u30a0-\u30ff]{2,6}/g) ?? []
  for (const w of words.slice(0, 4)) frags.push(w)
  return frags
}

export function tuningToJson(data: ConversationTuningData): string {
  return JSON.stringify(data, null, 2)
}
