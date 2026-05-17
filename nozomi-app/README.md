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

1. Import repo, set root directory to `nozomi-app`
2. Build: `npm run build`, output: `dist`
3. `vercel.json` handles SPA routing

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
