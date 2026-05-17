import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const srcDir = path.resolve(rootDir, 'src')

const redirects = (
  JSON.parse(readFileSync(path.join(rootDir, 'path-aliases.json'), 'utf8')) as {
    redirects: [string, string][]
  }
).redirects

/** Vite / Vitest resolve.alias entries (specific paths before `@`). */
export function createResolveAliases(): Array<{ find: string; replacement: string }> {
  return [
    ...redirects.map(([find, target]) => ({
      find,
      replacement: path.resolve(rootDir, target),
    })),
    { find: '@', replacement: srcDir },
    {
      find: 'onnxruntime-web/webgpu',
      replacement: path.resolve(
        rootDir,
        'node_modules/onnxruntime-web/dist/ort.wasm.bundle.min.mjs',
      ),
    },
  ]
}
