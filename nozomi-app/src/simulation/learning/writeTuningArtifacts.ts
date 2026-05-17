import { SIMULATION_TUNING, type ConversationTuningData } from '@/data/simulation-tuning'
import { setConversationTuning } from '@/systems/conversation/conversationTuning'
import { buildTuningFromConversations, tuningToJson } from './buildTuningFromExport'
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

/** Node/vitest only — writes public JSON + src defaults for next app load */
export async function persistTuningArtifacts(
  conversations: SimulatedConversation[],
): Promise<ConversationTuningData | null> {
  if (typeof process === 'undefined' || !('versions' in process)) return null
  const learned = buildTuningFromConversations(conversations)
  const tuning = mergeWithDefaultTuning(learned)
  setConversationTuning(tuning)

  try {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
    const jsonPath = path.join(appRoot, 'public/data/simulation-tuning.json')
    fs.writeFileSync(jsonPath, tuningToJson(tuning))

    const tsPath = path.join(appRoot, 'src/data/simulation-tuning.ts')
    const tsContent = generateTuningTsModule(tuning)
    fs.writeFileSync(tsPath, tsContent)
  } catch {
    /* browser bundle */
  }

  return tuning
}

function generateTuningTsModule(tuning: ConversationTuningData): string {
  return `/**
 * Tuning derived from simulation exports. Regenerate: npm run simulate then apply-insights
 */
export interface TuningHintRule {
  pattern: string
  jpBoost: string[]
}

export interface ConversationTuningData {
  version: number
  avoidJpContains: string[]
  hintRules: TuningHintRule[]
  questionOnShortAck: boolean
}

export const SIMULATION_TUNING: ConversationTuningData = ${JSON.stringify(tuning, null, 2)}
`
}
