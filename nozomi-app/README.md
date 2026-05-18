# Nozomi

Futuristic Japanese learning companion PWA — conversation-first, trilingual (JP / romaji / EN), local-first.

## Quick start

```bash
cd nozomi-app
npm install
npm run export-data   # optional: export from ../nozomi.sqlite (+ auto fill-romaji)
npm run fill-romaji   # fill missing romaji in public/data and ../nozomi.sqlite
npm run dev           # HMR at https://localhost:5173 (basic-ssl)
npm run dev:host      # LAN access for mobile testing
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server with hot reload |
| `npm run dev:host` | Dev server on local network |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | Playwright smoke + voice flows |
| `npm run test:a11y` | axe WCAG checks on `/chat` and `/listen` |
| `npm run lint` | ESLint (`src/`) |
| `npm run export-data` | Export SQLite → `public/data/*.json` |

## Deploy (Vercel)

Import the GitHub repo on [Vercel](https://vercel.com/new). The repo-root `vercel.json` installs and builds `nozomi-app/`, serves `nozomi-app/dist`, and rewrites all routes to the SPA.

**Headers:** This project does **not** set COOP/COEP on Vercel. Threaded WASM (Whisper) is intentionally single-threaded so Web Speech API live captions keep working in the browser. Do not add `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` unless you accept breaking browser STT.

**Performance:** First visit can be slow while IndexedDB seed data loads. Offline Whisper preloads only on `/listen` (and from Settings when local STT is selected) to avoid mobile tab crashes.

If the Vercel project root is `nozomi-app` instead of the monorepo root, use `nozomi-app/vercel.json` (same SPA rewrite, no extra headers).

Node **22** recommended (see `.nvmrc`). Build: `npm run build`.

## Project structure

See **[ARCHITECTURE.md](./ARCHITECTURE.md)** for module boundaries.

- `src/features/` — voice, orb, chat, presence, conversation (`@/features/voice`, …)
- `src/systems/conversation/` — engine; `nlu/`, `matching/`
- `src/components/` — shared UI (layout, language, vocab)
- `src/database/` — Dexie + import from JSON/SQLite export
- `src/data/` — static content; `public/data/` — exported JSON blobs
- `src/pages/` — Home, Chat, Listen, Word, Onboarding, Settings

## Data

Place [nozomi.sqlite](../nozomi.sqlite) in the parent folder and run `npm run export-data` to populate `public/data/`. Built-in seed data works offline without export.

## Accessibility

- **Reduce motion** and **static orb** in Settings
- **Focus mode** limits suggestion count
- Keyboard-navigable controls; `prefers-reduced-motion` respected in CSS
- Mic permission requested only when starting voice capture
- `npm run test:a11y` — automated serious/critical axe checks on chat and listen surfaces
