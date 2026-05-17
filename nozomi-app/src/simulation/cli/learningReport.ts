import { writeSync } from 'node:fs'
import type { AnalyticsSnapshot, FailureCluster, SimulatedConversation } from '../types'

function log(message: string): void {
  writeSync(2, `${message}\n`)
}

const fmt = (n: number) => n.toLocaleString('en-US')
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

export function printLearningReport(
  conversations: SimulatedConversation[],
  analytics: AnalyticsSnapshot,
): void {
  const n = conversations.length
  log('')
  log('[nozomi learn] ========== SIMULATION INSIGHTS ==========')
  log(`[nozomi learn] Conversations analyzed: ${fmt(n)}`)
  log('')

  log('[nozomi learn] -- Average scores --')
  const s = analytics.avgScores
  log(`[nozomi learn]   Overall:      ${pct(s.overall)}`)
  log(`[nozomi learn]   Engagement:   ${pct(s.engagement)}`)
  log(`[nozomi learn]   Continuation: ${pct(s.continuationQuality)}`)
  log(`[nozomi learn]   Immersion:    ${pct(s.immersion)}`)
  log(`[nozomi learn]   Japanese:     ${pct(s.japaneseCorrectness)}`)
  log(`[nozomi learn]   Suggestions:  ${pct(s.suggestionQuality)}`)
  log(`[nozomi learn]   Tutoring:     ${pct(s.tutoringQuality)}`)
  log(`[nozomi learn]   Retention risk: ${pct(s.retentionRisk)}`)
  log('')

  log('[nozomi learn] -- Failure clusters (fix these first) --')
  const sortedFailures = [...analytics.failureClusters].sort((a, b) => b.count - a.count)
  if (!sortedFailures.length) {
    log('[nozomi learn]   (none)')
  } else {
    for (const f of sortedFailures.slice(0, 8)) {
      const rate = ((f.count / Math.max(1, totalFailureTurns(conversations))) * 100).toFixed(1)
      log(
        `[nozomi learn]   ${f.kind}: ${fmt(f.count)} hits · severity ${pct(f.avgSeverity)} · ~${rate}% of failure events`,
      )
    }
  }
  log('')

  log('[nozomi learn] -- Most repeated Nozomi lines --')
  for (const r of analytics.repetitiveResponses.slice(0, 8)) {
    log(`[nozomi learn]   ×${fmt(r.count)}  "${r.phrase.slice(0, 48)}${r.phrase.length > 48 ? '…' : ''}"`)
  }
  if (!analytics.repetitiveResponses.length) log('[nozomi learn]   (none)')
  log('')

  log('[nozomi learn] -- Weakest topic/intent paths --')
  for (const w of analytics.weakPaths.slice(0, 8)) {
    log(
      `[nozomi learn]   ${w.topic}/${w.intent}: continuation ${pct(w.avgContinuation)} (${fmt(w.count)} turns)`,
    )
  }
  if (!analytics.weakPaths.length) log('[nozomi learn]   (none)')
  log('')

  const tq = analytics.tutoringQuality
  log('[nozomi learn] -- Tutoring --')
  log(
    `[nozomi learn]   Help requests: ${fmt(tq.helpRequests)} · addressed: ${fmt(tq.helpAddressed)} · grammar tags on replies: ${fmt(tq.grammarTagsInReplies)}`,
  )
  if (tq.helpRequests > 0) {
    const helpRate = ((tq.helpAddressed / tq.helpRequests) * 100).toFixed(1)
    log(`[nozomi learn]   Help response rate: ${helpRate}%`)
  }
  log('')

  log('[nozomi learn] -- End reasons --')
  for (const [reason, count] of countEndReasons(conversations)) {
    log(`[nozomi learn]   ${reason}: ${fmt(count)} (${((count / n) * 100).toFixed(1)}%)`)
  }
  log('')

  log('[nozomi learn] -- Actionable recommendations --')
  for (const rec of buildRecommendations(analytics, conversations)) {
    log(`[nozomi learn]   • ${rec}`)
  }
  log('[nozomi learn] =========================================')
  log('')
}

function totalFailureTurns(conversations: SimulatedConversation[]): number {
  return conversations.reduce((sum, c) => sum + c.failures.length, 0)
}

function countEndReasons(
  conversations: SimulatedConversation[],
): [string, number][] {
  const map = new Map<string, number>()
  for (const c of conversations) {
    const r = c.metadata.endedReason
    map.set(r, (map.get(r) ?? 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

function buildRecommendations(
  analytics: AnalyticsSnapshot,
  conversations: SimulatedConversation[],
): string[] {
  const recs: string[] = []
  const byKind = new Map(analytics.failureClusters.map((f) => [f.kind, f]))

  if ((byKind.get('dead_end')?.count ?? 0) > conversations.length * 0.05) {
    recs.push(
      'Reduce generic fallback ("そうですね。もう少し…") — expand contextual picks and rotate recovery lines.',
    )
  }
  const repetitionPerConv =
    (byKind.get('repetition')?.count ?? 0) / Math.max(1, conversations.length)
  if (repetitionPerConv > 0.15) {
    recs.push(
      `In-conversation repetition (~${repetitionPerConv.toFixed(1)} per conv) — diversify pool picks and recovery lines.`,
    )
  } else if (repetitionPerConv > 0.1) {
    recs.push(
      'Some repeated lines — avoid re-greeting loops and lexicon echo replies.',
    )
  }
  if (analytics.avgScores.continuationQuality < 0.68) {
    recs.push(
      'Continuation below target — strengthen topic stickiness on short user replies.',
    )
  }
  if (analytics.avgScores.retentionRisk > 0.18) {
    recs.push(
      'Retention risk elevated — use more follow-up questions when users sound bored.',
    )
  }
  if (analytics.tutoringQuality.grammarTagsInReplies === 0 && analytics.tutoringQuality.helpRequests > 0) {
    recs.push(
      'No grammarTags on replies — reload data v7+ (npm run fill-grammar-tags) or hard-refresh the app.',
    )
  }
  if ((byKind.get('tutoring_failure')?.count ?? 0) > conversations.length * 0.04) {
    recs.push(
      'Map わからない / 教えて / help inputs to help intent and grammar-hint personality lines.',
    )
  }
  if ((byKind.get('emotional_mismatch')?.count ?? 0) > conversations.length * 0.1) {
    recs.push(
      'When users send short/bored replies, prefer playful topic pivots or questions over generic acks.',
    )
  }
  if (analytics.avgScores.continuationQuality < 0.55) {
    recs.push(
      'Topic detection on romaji/English topic switches is weak — improve detectTopic for mixed input.',
    )
  }
  if (analytics.tutoringQuality.helpRequests > 0) {
    const rate = analytics.tutoringQuality.helpAddressed / analytics.tutoringQuality.helpRequests
    if (rate < 0.5) {
      recs.push('Help intent routing: many help requests do not get intent=help responses.')
    }
  }
  if (analytics.avgScores.suggestionQuality < 0.6) {
    recs.push('Suggestion pills duplicate or overlap Nozomi reply — diversify contextualSuggestions.')
  }
  if (recs.length === 0) {
    recs.push('Scores look healthy — focus on edge scenarios and N3+ pools.')
  }
  return recs
}

export function topFailureKind(clusters: FailureCluster[]): FailureCluster | undefined {
  return [...clusters].sort((a, b) => b.count - a.count)[0]
}
