#!/usr/bin/env node
/**
 * Validate sentence records before import / after export.
 *
 * Usage:
 *   node scripts/validate-sentences.mjs
 *   node scripts/validate-sentences.mjs --file public/data/sentences.json
 *   node scripts/validate-sentences.mjs --category train_station
 *   node scripts/validate-sentences.mjs --strict
 *   node scripts/validate-sentences.mjs --verbose --limit 30
 */
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  extractSentenceRows,
  SCENARIO_CATEGORIES,
  validateSentenceBatch,
} from './lib/sentenceValidator.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function parseArgs(argv) {
  const args = {
    file: path.join(root, 'public', 'data', 'sentences.json'),
    strict: false,
    verbose: false,
    limit: 25,
    category: null,
    companionOnly: false,
    allQuality: false,
  }

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--strict') args.strict = true
    else if (a === '--verbose') args.verbose = true
    else if (a === '--companion-only') args.companionOnly = true
    else if (a === '--all-quality') args.allQuality = true
    else if (a === '--file' && argv[i + 1]) args.file = path.resolve(argv[++i])
    else if (a === '--category' && argv[i + 1]) args.category = argv[++i]
    else if (a === '--limit' && argv[i + 1]) args.limit = Number(argv[++i]) || 25
    else if (a === '--help' || a === '-h') {
      console.log(`NOZOMI sentence validator

Options:
  --file <path>        JSON file (default: public/data/sentences.json)
  --category <name>    Only validate this category (e.g. train_station)
  --companion-only     Quality warnings for scenario/greeting/daily only (default for bulk)
  --all-quality        Quality warnings for every row (very noisy on full export)
  --verbose            Print individual issues (up to --limit)
  --limit <n>          Max issues to print (default 25)
  --strict             Exit 1 on warnings as well as errors
  --help               Show this help
`)
      process.exit(0)
    }
  }

  return args
}

function printIssues(issues, limit) {
  let shown = 0
  for (const item of issues) {
    for (const msg of item.errors) {
      console.error(`ERROR  ${msg}`)
      shown++
      if (shown >= limit) return shown
    }
    for (const msg of item.warnings) {
      console.warn(`WARN   ${msg}`)
      shown++
      if (shown >= limit) return shown
    }
  }
  return shown
}

const args = parseArgs(process.argv)

if (!existsSync(args.file)) {
  console.error(`File not found: ${args.file}`)
  console.error('Run from nozomi-app/ or pass --file <path>')
  process.exit(1)
}

let payload
try {
  payload = JSON.parse(readFileSync(args.file, 'utf8'))
} catch (e) {
  console.error(`Invalid JSON: ${args.file}`)
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}

let rows
try {
  rows = extractSentenceRows(payload)
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}

if (args.category) {
  rows = rows.filter((r) => r?.category === args.category)
  if (!rows.length) {
    console.warn(`No rows with category "${args.category}" in ${args.file}`)
  }
}

const companionQualityOnly = args.companionOnly || (!args.allQuality && !args.category)

const result = validateSentenceBatch(rows, {
  source: path.basename(args.file),
  companionQualityOnly,
})

console.log('')
console.log(`Validated ${result.total} sentence(s) in ${args.file}`)
console.log(`  Unique ids: ${result.uniqueIds}`)
console.log(`  Errors:   ${result.errorCount}`)
console.log(`  Warnings: ${result.warningCount}`)
if (args.companionOnly || companionQualityOnly) {
  console.log(
    `  Quality scope: ${args.allQuality ? 'all rows' : args.category ? `category=${args.category}` : 'companion categories only (scenario, greeting, daily)'}`,
  )
}
console.log(`  Scenario intents: ${SCENARIO_CATEGORIES.join(', ')}`)
console.log('')

if (args.verbose || result.errorCount > 0) {
  const shown = printIssues(result.issues, args.limit)
  const hidden =
    result.issues.reduce(
      (n, i) => n + i.errors.length + i.warnings.length,
      0,
    ) - shown
  if (hidden > 0) {
    console.log(`… and ${hidden} more (use --verbose --limit <n> to see more)`)
  }
} else if (result.warningCount > 0) {
  console.log('Run with --verbose to see warnings.')
}

const fail =
  result.errorCount > 0 || (args.strict && result.warningCount > 0)

if (fail) {
  process.exit(1)
}

console.log('OK — no blocking errors.')
process.exit(0)
