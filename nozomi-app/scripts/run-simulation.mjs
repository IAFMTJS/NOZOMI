/**

 * Headless batch simulation via Vitest (engine needs jsdom + Dexie).

 * Usage: npm run simulate -- [--count=1000]

 */

import { spawnSync } from 'node:child_process'

import path from 'node:path'

import { fileURLToPath } from 'node:url'



const __dirname = path.dirname(fileURLToPath(import.meta.url))

const appRoot = path.resolve(__dirname, '..')



const DEFAULT_COUNT = 1000

const countArg = process.argv.find((a) => a.startsWith('--count='))

const count = countArg ? Number(countArg.split('=')[1]) : DEFAULT_COUNT



if (!Number.isFinite(count) || count < 1) {

  console.error(`[nozomi simulate] Invalid --count= value (use a positive number)`)

  process.exit(1)

}



const fmt = (n) => n.toLocaleString('en-US')



/** ~1.2s/conv with full tagged DB; add headroom for report + IndexedDB writes */

function vitestTimeoutMs(n) {

  if (n >= 2000) return 0

  return Math.max(1_800_000, n * 2_500)

}



const timeoutMs = vitestTimeoutMs(count)



console.log('')

console.log('[nozomi simulate] ----------------------------------------')

console.log(

  `[nozomi simulate] Launching ${fmt(count)} conversations (override with --count=N)`,

)

if (timeoutMs === 0) {

  console.log('[nozomi simulate] No test timeout (large batch)')

} else {

  console.log(`[nozomi simulate] Test timeout: ${(timeoutMs / 60_000).toFixed(0)} min`)

}

console.log('[nozomi simulate] ----------------------------------------')

console.log('')



const env = {

  ...process.env,

  SIM_CONVERSATION_COUNT: String(count),

  SIM_CLI_PROGRESS: '1',

  SIM_LEARN_REPORT: '1',

}



const vitestArgs = ['vitest', 'run', 'src/simulation/simulation.batch.test.ts']

if (timeoutMs > 0) {

  vitestArgs.push(`--test-timeout=${timeoutMs}`)

} else {

  vitestArgs.push('--test-timeout=0')

}



const result = spawnSync('npx', vitestArgs, {

  cwd: appRoot,

  stdio: 'inherit',

  env,

  shell: true,

})



process.exit(result.status ?? 1)

