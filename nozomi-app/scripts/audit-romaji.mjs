import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(root, 'public', 'data')

function audit(file, key, checks) {
  const p = path.join(dataDir, file)
  if (!existsSync(p)) return
  const rows = JSON.parse(readFileSync(p, 'utf8'))[key] ?? []
  let empty = 0
  let compressed = 0
  for (const r of rows) {
    for (const { jp, romaji } of checks) {
      const j = r[jp]?.trim()
      const ro = r[romaji]?.trim()
      if (j && !ro) empty++
      if (j && ro && j.length > 6 && !ro.includes(' ') && ro.length > 12) compressed++
    }
  }
  console.log(`${file}: empty=${empty} compressed=${compressed} total=${rows.length}`)
}

audit('sentences.json', 'sentences', [{ jp: 'jp', romaji: 'romaji' }])
audit('vocabulary.json', 'vocabulary', [
  { jp: 'jp', romaji: 'romaji' },
  { jp: 'exampleJp', romaji: 'exampleRomaji' },
])
audit('personality.json', 'lines', [{ jp: 'jp', romaji: 'romaji' }])
audit('story-beats.json', 'beats', [{ jp: 'jp', romaji: 'romaji' }])
