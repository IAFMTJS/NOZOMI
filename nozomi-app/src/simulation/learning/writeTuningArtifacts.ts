import { SIMULATION_TUNING, type ConversationTuningData } from '@/data/simulation-tuning'
import { setConversationTuning } from '@/systems/conversation/matching'
import { buildTuningFromConversations } from './buildTuningFromExport'
import type { SimulatedConversation } from '../types'

export function applyTuningFromSimulations(
  conversations: SimulatedConversation[],
): ConversationTuningData {
  const tuning = buildTuningFromConversations(conversations)
  setConversationTuning(tuning)
  return tuning
}

export function mergeWithDefaultTuning(
  learned: ConversationTuningData,
): ConversationTuningData {
  return {
    version: learned.version,
    avoidJpContains: [
      ...new Set([...SIMULATION_TUNING.avoidJpContains, ...learned.avoidJpContains]),
    ].slice(0, 50),
    hintRules: [...SIMULATION_TUNING.hintRules, ...learned.hintRules].slice(0, 12),
    questionOnShortAck: learned.questionOnShortAck,
  }
}

/** Browser-safe: apply merged tuning in memory (no filesystem). */
export function persistTuningArtifactsInMemory(
  conversations: SimulatedConversation[],
): ConversationTuningData {
  const learned = buildTuningFromConversations(conversations)
  const tuning = mergeWithDefaultTuning(learned)
  setConversationTuning(tuning)
  return tuning
}
