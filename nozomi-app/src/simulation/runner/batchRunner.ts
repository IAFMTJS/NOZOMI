import type {
  ConversationScores,
  FailureCluster,
  SimulationConfig,
  SimulationRun,
} from '../types'
import { DEFAULT_SIM_CONFIG as DEFAULT_CONFIG } from '../types'
import { generateUsersForConfig } from '../user/fakeUserGenerator'
import { runSingleConversation } from './conversationRunner'
import {
  saveAnalytics,
  saveConversationsBatch,
  saveRun,
} from '../storage/simulationDb'
import { buildAnalyticsSnapshot } from '../analytics/aggregates'
import { uid, mulberry32 } from '../utils/random'
import { persistTuningArtifacts } from '../learning/writeTuningArtifacts'
import { ensureSimulationReady } from '../setup/simulationHarness'

export type BatchProgress = {
  runId: string
  completed: number
  total: number
  status: SimulationRun['status']
}

export async function runSimulationBatch(
  config: Partial<SimulationConfig> = {},
  onProgress?: (p: BatchProgress) => void,
): Promise<SimulationRun> {
  await ensureSimulationReady()

  const fullConfig: SimulationConfig = { ...DEFAULT_CONFIG, ...config }
  const rng = mulberry32(fullConfig.deterministicSeed ?? Date.now())
  const runId = uid('run', rng)

  const run: SimulationRun = {
    id: runId,
    config: fullConfig,
    status: 'running',
    startedAt: Date.now(),
    conversationIds: [],
  }
  await saveRun(run)

  const users = generateUsersForConfig(fullConfig, fullConfig.deterministicSeed)
  const batchSize = fullConfig.parallelBatchSize ?? 8
  const conversations: Awaited<ReturnType<typeof runSingleConversation>>[] = []

  for (let i = 0; i < users.length; i += batchSize) {
    const chunk = users.slice(i, i + batchSize)
    const results = await Promise.all(
      chunk.map((user, j) =>
        runSingleConversation({
          runId,
          config: fullConfig,
          user,
          conversationIndex: i + j,
        }),
      ),
    )
    conversations.push(...results)
    await saveConversationsBatch(results)

    run.conversationIds.push(...results.map((c) => c.id))
    onProgress?.({
      runId,
      completed: Math.min(i + batchSize, users.length),
      total: users.length,
      status: 'running',
    })
  }

  run.aggregateScores = averageConversationScores(conversations.map((c) => c.scores))
  run.failureClusters = clusterFailures(conversations)
  run.status = 'completed'
  run.completedAt = Date.now()
  await saveRun(run)

  const analytics = buildAnalyticsSnapshot(runId, conversations)
  await saveAnalytics(analytics)
  await persistTuningArtifacts(conversations)

  onProgress?.({
    runId,
    completed: users.length,
    total: users.length,
    status: 'completed',
  })

  return run
}

function averageConversationScores(scores: ConversationScores[]): ConversationScores {
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

function clusterFailures(
  conversations: Awaited<ReturnType<typeof runSingleConversation>>[],
): FailureCluster[] {
  const map = new Map<
    string,
    { count: number; severity: number; ids: string[] }
  >()

  for (const conv of conversations) {
    for (const f of conv.failures) {
      const key = f.kind
      const row = map.get(key) ?? { count: 0, severity: 0, ids: [] }
      row.count += 1
      row.severity += f.severity
      if (row.ids.length < 5) row.ids.push(conv.id)
      map.set(key, row)
    }
  }

  return [...map.entries()].map(([kind, row]) => ({
    kind: kind as FailureCluster['kind'],
    count: row.count,
    avgSeverity: row.count ? row.severity / row.count : 0,
    exampleConversationIds: row.ids,
  }))
}
