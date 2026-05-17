import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/** Serve public/data/*.json in Vitest (jsdom fetch has no Vite dev server). */
const publicDir = join(import.meta.dirname, '../../public')
const nativeFetch = globalThis.fetch.bind(globalThis)

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.pathname
        : input.url
  const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '')
  if (path.startsWith('data/')) {
    const file = join(publicDir, path)
    if (existsSync(file)) {
      return new Response(readFileSync(file, 'utf8'), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }
  return nativeFetch(input, init)
}
