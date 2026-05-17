import type { DatasetRecord, SimulatedConversation } from '../types'
import { getConversationsForRun } from '../storage/simulationDb'

export function conversationToDatasetRecord(
  conv: SimulatedConversation,
): DatasetRecord {
  const turns: DatasetRecord['turns'] = []
  let pendingUser: string | undefined

  for (const t of conv.turns) {
    if (t.role === 'user') {
      pendingUser = t.text
    } else if (t.role === 'nozomi' && pendingUser !== undefined) {
      turns.push({
        user: pendingUser,
        nozomi: t.text,
        intent: t.detectedIntent,
        topic: t.detectedTopic,
      })
      pendingUser = undefined
    }
  }

  return {
    conversationId: conv.id,
    turns,
    scores: conv.scores,
    persona: conv.user.profile.personalityMode,
    level: conv.user.profile.jlptLevel,
    goal: conv.user.goal,
  }
}

export function generateDatasetFromConversations(
  conversations: SimulatedConversation[],
): DatasetRecord[] {
  return conversations.map(conversationToDatasetRecord)
}

export async function generateDatasetForRun(
  runId: string,
): Promise<DatasetRecord[]> {
  const conversations = await getConversationsForRun(runId)
  return generateDatasetFromConversations(conversations)
}

export function datasetToJsonl(records: DatasetRecord[]): string {
  return records.map((r) => JSON.stringify(r)).join('\n')
}

export function datasetToTrainingPairs(
  records: DatasetRecord[],
): { input: string; output: string; meta: Record<string, unknown> }[] {
  const pairs: { input: string; output: string; meta: Record<string, unknown> }[] = []
  for (const rec of records) {
    for (const turn of rec.turns) {
      pairs.push({
        input: turn.user,
        output: turn.nozomi,
        meta: {
          conversationId: rec.conversationId,
          intent: turn.intent,
          topic: turn.topic,
          level: rec.level,
          persona: rec.persona,
          goal: rec.goal,
          overallScore: rec.scores.overall,
        },
      })
    }
  }
  return pairs
}
