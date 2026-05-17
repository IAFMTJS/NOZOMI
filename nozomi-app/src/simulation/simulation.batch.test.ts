import { describe, it, expect } from 'vitest'
import { runSimulationBatch } from './runner/batchRunner'
import { getAnalytics, getConversationsForRun } from './storage/simulationDb'
import { ensureSimulationReady } from './setup/simulationHarness'
import { ALL_PERSONALITY_IDS } from './config/personalityTemplates'
import {
  createTerminalProgressHandler,
  logSimulationComplete,
  logSimulationStart,
  simulationTestTimeoutMs,
} from './cli/terminalProgress'
import { printLearningReport } from './cli/learningReport'
import { buildAnalyticsSnapshot } from './analytics/aggregates'

const runBatch = Boolean(process.env.SIM_CONVERSATION_COUNT?.trim())
const count = runBatch ? Number(process.env.SIM_CONVERSATION_COUNT) : 0
const showProgress = process.env.SIM_CLI_PROGRESS !== '0'

describe.skipIf(!runBatch)('simulation batch', () => {
  it(
    `runs ${count} automated conversations`,
    { timeout: simulationTestTimeoutMs(count) },
    async () => {
      if (showProgress) logSimulationStart(count)

      await ensureSimulationReady()
      const onProgress = showProgress ? createTerminalProgressHandler(count) : undefined

      const run = await runSimulationBatch(
        {
          conversationCount: count,
          maxTurnsPerConversation: 8,
          minTurnsPerConversation: 3,
          personalities: ALL_PERSONALITY_IDS,
          jlptLevels: ['N5', 'N4'],
          goals: ['small_talk', 'get_help', 'scenario_roleplay'],
          parallelBatchSize: count >= 1000 ? 32 : count >= 500 ? 24 : 8,
          deterministicSeed: 4242,
        },
        onProgress,
      )

      if (showProgress) logSimulationComplete(run, run.aggregateScores)

      const convs = await getConversationsForRun(run.id)
      const snapshot = buildAnalyticsSnapshot(run.id, convs)
      if (showProgress || process.env.SIM_LEARN_REPORT === '1') {
        printLearningReport(convs, snapshot)
      }

      expect(run.status).toBe('completed')
      expect(run.conversationIds.length).toBe(count)

      const stored = await getAnalytics(run.id)
      expect(stored?.totalConversations).toBe(count)
      expect(convs.length).toBe(count)
      for (const c of convs.slice(0, 5)) {
        expect(c.turns.length).toBeGreaterThan(0)
        expect(c.scores.overall).toBeGreaterThanOrEqual(0)
        expect(c.metadata.durationMs).toBeGreaterThan(0)
      }
    },
  )
})
