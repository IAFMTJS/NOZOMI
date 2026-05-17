/**
 * Backfill grammarTags on sentences.json and report coverage.
 * Usage: npm run fill-grammar-tags [-- --dry-run] [-- --seeds-only]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inferGrammarTags } from './lib/grammarTagInference.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')
const sentencesPath = path.join(appRoot, 'public/data/sentences.json')

const dryRun = process.argv.includes('--dry-run')
const seedsOnly = process.argv.includes('--seeds-only')

function loadSentences() {
  const raw = readFileSync(sentencesPath, 'utf8')
  return JSON.parse(raw)
}

function tagRecord(s) {
  if (s.grammarTags?.trim()) return { changed: false, tags: s.grammarTags }
  const tags = inferGrammarTags(s.jp)
  if (!tags) return { changed: false, tags: '' }
  return { changed: true, tags }
}

if (!seedsOnly) {
  console.log('[fill-grammar-tags] Loading sentences.json…')
  const bundle = loadSentences()
  const list = bundle.sentences ?? []
  let filled = 0
  let already = 0
  let skipped = 0

  for (const s of list) {
    if (s.grammarTags?.trim()) {
      already++
      continue
    }
    const jp = s.jp?.trim() ?? ''
    if (!jp || jp.length > 72) {
      skipped++
      continue
    }
    const tags = inferGrammarTags(jp)
    if (tags) {
      s.grammarTags = tags
      filled++
    } else {
      skipped++
    }
  }

  console.log(`[fill-grammar-tags] Total: ${list.length}`)
  console.log(`[fill-grammar-tags] Already tagged: ${already}`)
  console.log(`[fill-grammar-tags] Newly tagged: ${filled}`)
  console.log(`[fill-grammar-tags] Still empty: ${list.length - already - filled}`)

  if (!dryRun && filled > 0) {
    writeFileSync(sentencesPath, JSON.stringify(bundle))
    console.log('[fill-grammar-tags] Wrote public/data/sentences.json')
  } else if (dryRun) {
    console.log('[fill-grammar-tags] Dry run — no file written')
  }
}

console.log('[fill-grammar-tags] Done. Bump dataVersion in importService if not dry-run.')
