# Nozomi

Futuristic Japanese learning companion PWA — conversation-first, trilingual (JP / romaji / EN), local-first.

## Quick start

```bash
cd nozomi-app
npm install
npm run export-data   # optional: export from ../nozomi.sqlite (+ auto fill-romaji)
npm run fill-romaji   # fill missing romaji in public/data and ../nozomi.sqlite
npm run dev           # HMR at http://localhost:5173
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
| `npm run export-data` | Export SQLite → `public/data/*.json` |

## Deploy (Vercel)

Import the GitHub repo on [Vercel](https://vercel.com/new). No extra settings are required: the repo-root `vercel.json` installs and builds `nozomi-app/`, serves `nozomi-app/dist`, rewrites all routes to the SPA, and sets COOP/COEP headers for threaded WASM (offline STT).

If you prefer a project rooted in `nozomi-app`, use that folder as the root directory instead; `nozomi-app/vercel.json` has the same routing and headers.

Node **20+** (see `.nvmrc`). Build command: `npm run build`.

## Project structure

- `src/components/` — UI (orb, chat, language, suggestions)
- `src/systems/` — conversation engine, speech
- `src/database/` — Dexie + import from JSON/SQLite export
- `src/pages/` — Home, Chat, Listen, Word, Onboarding, Settings

## Data

Place [nozomi.sqlite](../nozomi.sqlite) in parent folder and run `npm run export-data` to populate `public/data/`. Built-in seed data works offline without export.

## Accessibility

- **Reduce motion** and **static orb** in Settings
- **Focus mode** limits suggestion count
- Keyboard-navigable controls; `prefers-reduced-motion` respected in CSS
- Mic permission requested only when starting voice capture
