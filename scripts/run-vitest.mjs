/**
 * Run vitest with nozomi-app as cwd (aliases + setup). Use from repo root.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appRoot = path.join(root, 'nozomi-app')
const args = process.argv.slice(2)

const result = spawnSync('npx', ['vitest', ...args], {
  cwd: appRoot,
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

process.exit(result.status ?? 1)
