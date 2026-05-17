import type {
  AnalyticsSnapshot,
  ConversationScores,
  EmotionalDropOff,
  FailureCluster,
  RepetitionReport,
  RetentionRiskPoint,
  SimulatedConversation,
  TutoringQualityReport,
  WeakPath,
} from '../types'

export function buildAnalyticsSnapshot(
  runId: string,
  conversations: SimulatedConversation[],
): AnalyticsSnapshot {
  return {
    runId,
    totalConversations: conversations.length,
    failureClusters: clusterFailures(conversations),
    weakPaths: findWeakPaths(conversations),
    repetitiveResponses: findRepetitiveResponses(conversations),
    emotionalDropOffs: findEmotionalDropOffs(conversations),
    retentionRisks: findRetentionRisks(conversations),
    tutoringQuality: summarizeTutoring(conversations),
    avgScores: averageScores(conversations),
  }
}

function averageScores(conversations: SimulatedConversation[]): ConversationScores {
  const scores = conversations.map((c) => c.scores)
  if (!scores.length) {
    return {
      overall: 0,
      immersion: 0,
      engagement: 0,
      japaneseCorrectness: 0,
      continuationQuality: 0,
      suggestionQuality: 0,
      tutoringQuality: 0,
      retentionRisk: 0,
    }
  }
  const keys = Object.keys(scores[0]!) as (keyof ConversationScores)[]
  const out = {} as ConversationScores
  for (const k of keys) {
    out[k] = scores.reduce((s, c) => s + c[k], 0) / scores.length
  }
  return out
}

function clusterFailures(conversations: SimulatedConversation[]): FailureCluster[] {
  const map = new Map<string, { count: number; severity: number; ids: string[] }>()
  for (const conv of conversations) {
    for (const f of conv.failures) {
      const row = map.get(f.kind) ?? { count: 0, severity: 0, ids: [] }
      row.count += 1
      row.severity += f.severity
      if (row.ids.length < 5) row.ids.push(conv.id)
      map.set(f.kind, row)
    }
  }
  return [...map.entries()].map(([kind, row]) => ({
    kind: kind as FailureCluster['kind'],
    count: row.count,
    avgSeverity: row.count ? row.severity / row.count : 0,
    exampleConversationIds: row.ids,
  }))
}

function findWeakPaths(conversations: SimulatedConversation[]): WeakPath[] {
  const map = new Map<string, { count: number; cont: number }>()
  for (const conv of conversations) {
    for (const t of conv.turns) {
      if (t.role !== 'nozomi' || !t.detectedTopic) continue
      const key = `${t.detectedTopic}|${t.detectedIntent ?? 'unknown'}`
      const row = map.get(key) ?? { count: 0, cont: 0 }
      row.count += 1
      row.cont += conv.scores.continuationQuality
      map.set(key, row)
    }
  }
  return [...map.entries()]
    .map(([key, row]) => {
      const [topic, intent] = key.split('|')
      return {
        topic: topic!,
        intent: intent!,
        count: row.count,
        avgContinuation: row.cont / row.count,
      }
    })
    .filter((p) => p.avgContinuation < 0.5)
    .sort((a, b) => a.avgContinuation - b.avgContinuation)
    .slice(0, 20)
}

function findRepetitiveResponses(
  conversations: SimulatedConversation[],
): RepetitionReport[] {
  const phraseCount = new Map<string, { count: number; ids: Set<string> }>()
  for (const conv of conversations) {
    let nozomiTurn = 0
    for (const t of conv.turns) {
      if (t.role !== 'nozomi') continue
      nozomiTurn += 1
      if (nozomiTurn <= 1) continue
      const jp = t.text.trim()
      if (jp.length < 6) continue
      const row = phraseCount.get(jp) ?? { count: 0, ids: new Set() }
      row.count += 1
      row.ids.add(conv.id)
      phraseCount.set(jp, row)
    }
  }
  return [...phraseCount.entries()]
    .filter(([, row]) => row.count >= 3)
    .map(([phrase, row]) => ({
      phrase,
      count: row.count,
      conversationIds: [...row.ids].slice(0, 10),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25)
}

function findEmotionalDropOffs(
  conversations: SimulatedConversation[],
): EmotionalDropOff[] {
  const buckets = new Map<
    number,
    { before: number[]; after: number[] }
  >()

  for (const conv of conversations) {
    const userTurns = conv.turns.filter((t) => t.role === 'user' && t.userEmotion)
    for (let i = 1; i < userTurns.length; i++) {
      const prev = userTurns[i - 1]!.userEmotion!.engagement
      const curr = userTurns[i]!.userEmotion!.engagement
      if (prev - curr < 0.15) continue
      const idx = userTurns[i]!.turnIndex
      const b = buckets.get(idx) ?? { before: [], after: [] }
      b.before.push(prev)
      b.after.push(curr)
      buckets.set(idx, b)
    }
  }

  return [...buckets.entries()]
    .map(([turnIndex, b]) => ({
      turnIndex,
      avgEngagementBefore: b.before.reduce((a, x) => a + x, 0) / b.before.length,
      avgEngagementAfter: b.after.reduce((a, x) => a + x, 0) / b.after.length,
      count: b.before.length,
    }))
    .filter((d) => d.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
}

function findRetentionRisks(
  conversations: SimulatedConversation[],
): RetentionRiskPoint[] {
  const buckets = new Map<number, number[]>()
  for (const conv of conversations) {
    for (const f of conv.failures.filter((x) => x.kind === 'retention_risk')) {
      const list = buckets.get(f.turnIndex) ?? []
      list.push(f.severity)
      buckets.set(f.turnIndex, list)
    }
  }
  return [...buckets.entries()]
    .map(([turnIndex, severities]) => ({
      turnIndex,
      riskScore: severities.reduce((a, b) => a + b, 0) / severities.length,
      count: severities.length,
    }))
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 15)
}

function summarizeTutoring(
  conversations: SimulatedConversation[],
): TutoringQualityReport {
  let helpRequests = 0
  let helpAddressed = 0
  let correctionsOffered = 0
  let grammarTagsInReplies = 0
  let teacherModeSessions = 0

  for (const conv of conversations) {
    const isTeacher =
      conv.user.profile.personalityMode === 'teacher' ||
      conv.user.profile.personalityMode === 'strict_tutor'
    if (isTeacher) teacherModeSessions += 1

    for (const t of conv.turns) {
      if (t.role === 'user' && /help|教えて|わからない/i.test(t.text)) {
        helpRequests += 1
      }
      if (t.role === 'nozomi' && t.response?.intent === 'help') {
        helpAddressed += 1
      }
      if (t.response?.grammarTags?.trim()) {
        correctionsOffered += 1
        grammarTagsInReplies += 1
      }
    }
  }

  const score =
    conversations.reduce((s, c) => s + c.scores.tutoringQuality, 0) /
    Math.max(1, conversations.length)

  return {
    helpRequests,
    helpAddressed,
    correctionsOffered,
    grammarTagsInReplies,
    teacherModeSessions,
    score,
  }
}
