#!/usr/bin/env node
/**
 * Download JMdict (English common words) and merge into ../nozomi.sqlite.
 * Then optionally fill romaji and export JSON for the PWA.
 *
 *   npm run import-jmdict
 *   npm run import-jmdict -- --max 3000
 *   npm run import-jmdict -- --dry-run
 *   npm run import-jmdict -- --export
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const pyScript = path.join(__dirname, 'import_jmdict.py')

const passthrough = process.argv.slice(2)
const doExport = passthrough.includes('--export')
const pyArgs = passthrough.filter((a) => a !== '--export')

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf-8',
    stdio: 'inherit',
    cwd: root,
    ...opts,
  })
  return r.status ?? 1
}

const status = run('python', [pyScript, ...pyArgs])
if (status !== 0) process.exit(status)

if (doExport || passthrough.length === 0) {
  console.log('\n--- fill-romaji ---')
  const r1 = run('node', [path.join(__dirname, 'fill-romaji.mjs')])
  if (r1 !== 0) process.exit(r1)
  console.log('\n--- export-data ---')
  const r2 = run('node', [path.join(__dirname, 'export-data.mjs')])
  process.exit(r2)
}

process.exit(0)
