import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ConversationTuningData } from '@/data/simulation-tuning'
import { tuningToJson } from './buildTuningFromExport'
import type { SimulatedConversation } from '../types'
import { persistTuningArtifactsInMemory } from './writeTuningArtifacts'

/** Node / Vitest only — writes public JSON + src defaults for next app load. */
export async function persistTuningArtifactsToDisk(
  conversations: SimulatedConversation[],
): Promise<ConversationTuningData> {
  const tuning = persistTuningArtifactsInMemory(conversations)

  const appRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../..',
  )
  const jsonPath = path.join(appRoot, 'public/data/simulation-tuning.json')
  fs.writeFileSync(jsonPath, tuningToJson(tuning))

  const tsPath = path.join(appRoot, 'src/data/simulation-tuning.ts')
  fs.writeFileSync(tsPath, generateTuningTsModule(tuning))

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
