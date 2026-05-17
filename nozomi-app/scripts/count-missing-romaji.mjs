import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(root, 'public', 'data')

const files = [
  { file: 'sentences.json', key: 'sentences' },
  { file: 'vocabulary.json', key: 'vocabulary' },
  { file: 'personality.json', key: 'lines' },
  { file: 'story-beats.json', key: 'beats' },
]

for (const { file, key } of files) {
  const p = path.join(dataDir, file)
  if (!existsSync(p)) continue
  const d = JSON.parse(readFileSync(p, 'utf8'))
  const rows = d[key] ?? []
  const miss = rows.filter((r) => !r.romaji?.trim())
  const exMiss = rows.filter(
    (r) => r.exampleJp?.trim() && !r.exampleRomaji?.trim(),
  )
  console.log(
    `${file}: ${rows.length} rows, ${miss.length} missing romaji, ${exMiss.length} missing exampleRomaji`,
  )
}
