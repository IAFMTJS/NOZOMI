import fs from 'node:fs'
import path from 'node:path'

const src = fs.readFileSync('src/styles/index.css', 'utf8').split(/\r?\n/)
const ranges = [
  ['tokens.css', 2, 27],
  ['base.css', 28, 111],
  ['backdrop.css', 112, 168],
  ['surfaces.css', 169, 250],
  ['navigation.css', 251, 334],
  ['chat.css', 335, 441],
  ['typography.css', 442, 488],
  ['presence.css', 489, 885],
  ['backdrop-motion.css', 886, 936],
  ['overlays.css', 937, 982],
  ['typography-messages.css', 983, 1001],
  ['shell-nav.css', 1002, 1049],
  ['reduced-motion.css', 1050, 1063],
]
const outDir = 'src/features/design/styles/sections'
fs.mkdirSync(outDir, { recursive: true })
for (const [file, start, end] of ranges) {
  const chunk = src.slice(start, end + 1).join('\n') + '\n'
  fs.writeFileSync(path.join(outDir, file), chunk)
}
const index = [
  ...ranges.map(([f]) => `@import './sections/${f}';`),
  `@import '../../orb/styles/orb.css';`,
  '',
].join('\n')
fs.writeFileSync('src/features/design/styles/index.css', index)
fs.writeFileSync(
  'src/styles/index.css',
  "@import 'tailwindcss';\n@import '../features/design/styles/index.css';\n",
)
console.log('split ok', ranges.length, 'section files')
