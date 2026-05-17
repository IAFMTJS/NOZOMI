/**
 * Build conversation tuning from a simulation export JSON.
 * Usage:
 *   npm run apply-simulation-insights -- --run=<runId>
 *   npm run apply-simulation-insights -- --file=path/to/export.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')

async function main() {
  const { buildTuningFromConversations, tuningToJson } = await import(
    '../src/simulation/learning/buildTuningFromExport.ts'
  )

  const runArg = process.argv.find((a) => a.startsWith('--run='))
  const fileArg = process.argv.find((a) => a.startsWith('--file='))

  let conversations = []

  if (fileArg) {
    const filePath = path.resolve(fileArg.split('=')[1])
    const raw = JSON.parse(readFileSync(filePath, 'utf8'))
    conversations = raw.conversations ?? raw
  } else if (runArg) {
    console.error(
      '[apply-insights] Export run JSON from Simulation Lab first, then pass --file=export.json',
    )
    console.error('[apply-insights] Or paste run export path from dashboard Export JSON.')
    process.exit(1)
  } else {
    console.error('Usage: npm run apply-simulation-insights -- --file=export.json')
    process.exit(1)
  }

  const tuning = buildTuningFromConversations(conversations)
  const jsonPath = path.join(appRoot, 'public/data/simulation-tuning.json')
  writeFileSync(jsonPath, tuningToJson(tuning))

  const tsPath = path.join(appRoot, 'src/data/simulation-tuning.ts')
  const tsBody = `/**
 * Tuning derived from simulation exports. Regenerate via npm run apply-simulation-insights
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
  writeFileSync(tsPath, tsBody)

  console.log(`[apply-insights] Wrote ${jsonPath}`)
  console.log(`[apply-insights] Wrote ${tsPath}`)
  console.log(`[apply-insights] Avoid phrases: ${tuning.avoidJpContains.length}`)
  console.log(`[apply-insights] Hint rules: ${tuning.hintRules.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
