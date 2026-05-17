import Dexie, { type Table } from 'dexie'
import type {
  AnalyticsSnapshot,
  SimulatedConversation,
  SimulationRun,
} from '../types'

class SimulationDatabase extends Dexie {
  runs!: Table<SimulationRun, string>
  conversations!: Table<SimulatedConversation, string>
  analytics!: Table<AnalyticsSnapshot, string>

  constructor() {
    super('nozomi-simulation')
    this.version(1).stores({
      runs: 'id, status, startedAt',
      conversations: 'id, runId, createdAt',
      analytics: 'runId',
    })
  }
}

export const simulationDb = new SimulationDatabase()

export async function saveRun(run: SimulationRun): Promise<void> {
  await simulationDb.runs.put(run)
}

export async function saveConversation(conv: SimulatedConversation): Promise<void> {
  await simulationDb.conversations.put(conv)
}

export async function saveConversationsBatch(
  convs: SimulatedConversation[],
): Promise<void> {
  await simulationDb.conversations.bulkPut(convs)
}

export async function saveAnalytics(snapshot: AnalyticsSnapshot): Promise<void> {
  await simulationDb.analytics.put(snapshot)
}

export async function getRun(id: string): Promise<SimulationRun | undefined> {
  return simulationDb.runs.get(id)
}

export async function listRuns(limit = 50): Promise<SimulationRun[]> {
  return simulationDb.runs.orderBy('startedAt').reverse().limit(limit).toArray()
}

export async function getConversationsForRun(
  runId: string,
): Promise<SimulatedConversation[]> {
  return simulationDb.conversations.where('runId').equals(runId).toArray()
}

export async function getConversation(
  id: string,
): Promise<SimulatedConversation | undefined> {
  return simulationDb.conversations.get(id)
}

export async function getAnalytics(
  runId: string,
): Promise<AnalyticsSnapshot | undefined> {
  return simulationDb.analytics.get(runId)
}

export async function exportRunJson(runId: string): Promise<string> {
  const run = await getRun(runId)
  const conversations = await getConversationsForRun(runId)
  const analytics = await getAnalytics(runId)
  return JSON.stringify({ run, conversations, analytics }, null, 2)
}

export async function clearSimulationData(): Promise<void> {
  await simulationDb.runs.clear()
  await simulationDb.conversations.clear()
  await simulationDb.analytics.clear()
}
