/**
 * Run a smaller batch and print learning insights (faster than full 5000).
 * Usage: npm run simulate:learn -- [--count=400]
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')

const DEFAULT_COUNT = 400
const countArg = process.argv.find((a) => a.startsWith('--count='))
const count = countArg ? Number(countArg.split('=')[1]) : DEFAULT_COUNT

const env = {
  ...process.env,
  SIM_CONVERSATION_COUNT: String(count),
  SIM_CLI_PROGRESS: '1',
  SIM_LEARN_REPORT: '1',
}

const result = spawnSync(
  'npx',
  ['vitest', 'run', 'src/simulation/simulation.batch.test.ts'],
  { cwd: appRoot, stdio: 'inherit', env, shell: true },
)

process.exit(result.status ?? 1)
