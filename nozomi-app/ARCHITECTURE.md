# Nozomi architecture

Module boundaries for maintenance. **Dependency direction:** UI → orchestration → `features/*/logic` + `systems/*` → `database` / `data`.

## Feature modules (`src/features/`)

| Feature | Path | Public import |
|---------|------|----------------|
| **Voice** | `voice/logic`, `voice/ui`, `voice/context`, `voice/hooks` | `@/features/voice` |
| **Orb** | `orb/logic`, `orb/ui`, `orb/hooks` | `@/features/orb` |
| **Chat** | `chat/ui` | `@/features/chat` |
| **Presence** | `presence/ui` (+ `suggestions/`) | `@/features/presence` |
| **Conversation** | `conversation/useConversation.ts` | `@/features/conversation` |
| **Design** | `design/catalog`, `design/styles/sections` | `@/features/design` |

Legacy paths (`@/systems/speech`, `@/components/audio`, `@/hooks/useConversation`, …) still resolve via `path-aliases.json` (tsconfig + Vite). Prefer `@/features/*` in new code.

## Visual & design (`features/design/`)

All UI styling is grouped **by section** (not one flat stylesheet). Entry: `src/styles/index.css` → `features/design/styles/index.css`.

| Section ID | CSS file(s) | Primary UI |
|------------|-------------|------------|
| `tokens` | `sections/tokens.css` | Tailwind `@theme` colors & fonts |
| `shell` | `base.css`, `shell-nav.css`, `reduced-motion.css` | App shell, safe areas, bottom nav |
| `backdrop` | `backdrop.css`, `backdrop-motion.css` | `FuturisticBackdrop` |
| `surfaces` | `surfaces.css` | `glass-panel`, glow utilities |
| `navigation` | `navigation.css` | Dock actions, mic FAB |
| `chat` | `chat.css` | Compose bar, message bubbles |
| `suggestions` | `chat.css` (shared) | Pills, scenario cards |
| `typography` | `typography.css`, `typography-messages.css` | `LanguageText`, tri-line |
| `presence` | `presence.css` | Home / listen layout, floats, dock |
| `orb` | `features/orb/styles/orb.css` | Orb canvas, waveform, anchor |
| `voice` | (orb + surfaces) | Transcript, mic banners |
| `language` | (typography + surfaces) | Word tap, furigana |
| `overlays` | `overlays.css` | History sheet |
| `settings` | surfaces + shell | Settings, onboarding |

**Catalog:** `features/design/catalog/visualSections.ts` — `VISUAL_SECTIONS`, `getVisualSection(id)`, `visualSectionsByFeature(feature)`.  
**Rule:** Put new styles in the matching `sections/*.css`; do not mix unrelated domains in one file.

## Layers

| Layer | Path | Role |
|-------|------|------|
| Presentation | `pages/`, `components/`, `features/*/ui`, `styles/` | React UI |
| Orchestration | `features/conversation`, `features/voice/context`, `hooks/` | Wire UI to logic + store |
| Domain logic | `features/*/logic`, `systems/*` | Pure TS, unit-tested |
| State | `store/` | Zustand (`useNozomiStore` persisted, `useUiStore` ephemeral) |
| Content | `data/`, `public/data/` | Static JSON + hand-authored TS |
| Persistence | `database/` | Dexie schema + import + queries |
| Kernel | `types/`, `utils/` | Shared types and language helpers |
| Dev tooling | `simulation/` | Batch eval — must not be imported by production UI |

## Domains

### Voice (`features/voice/`)

Mic permission, STT (browser / offline Whisper), TTS, listen lifecycle, audio level, barge-in, silence endpointing, turn metrics.  
**Public API:** `@/features/voice` (re-exports `logic/speechService.ts`).  
**Must not** import conversation engine or orb rendering.

#### Voice state machine

| `SpeechState` | Typical `OrbState` | Meaning |
|---------------|-------------------|---------|
| `idle` | `idle` | Ready |
| `permission_pending` | `listening` | Mic opening |
| `listening` | `listening` | Capturing user speech |
| `processing` | `thinking` | STT finalize + engine |
| `speaking` | `speaking` | TTS playback (barge-in enabled) |
| `error` | `idle` | Mic/STT failure |

Turn flow: `listen_start` → (`listen_finish` on stop) → `stt_done` → `engine_start` / `engine_done` → `tts_start` / `tts_end`. Spans recorded in `voiceTurnMetrics.ts`; dev overlay on Listen page (`?voiceDebug=1`).

Settings: `voiceListenMode` (push / auto_stop / continuous), `listenEndMode`, `ttsProvider`, `whisperModel`, Labs flags (`labsWakeWord`, `labsCloudLlm`, …).

Integration bridges (avoid glitches between subsystems):

- `ttsOutputState.ts` — single “assistant speaking” flag (browser `speechSynthesis` + cloud `Audio`).
- `voiceTurnBridge.ts` — barge-in grace period, continuous-listen generation guards.
- `startListenPipeline.ts` — shared wait after TTS before opening the mic.
- `endListenSessionAfterTurn({ keepMic })` — continuous mode keeps the shared mic on `/listen`.

### Orb (`features/orb/`)

Visual presence; reads `orbState` + audio level from store/hooks.  
**Must not** import STT or reply matching.

### Chat & presence UI (`features/chat/`, `features/presence/`)

Text thread (`ChatPage`) vs orb-first surfaces (`HomePage`, `ListeningPage`).  
**Orchestrator:** `features/conversation/useConversation.ts` — sequences engine + TTS + store.

### Conversation brain (`systems/conversation/`)

| Submodule | Path | Responsibility |
|-----------|------|----------------|
| Engine | `engine.ts`, `storyRunner.ts`, `lexiconPool.ts`, `contextualSuggestions.ts` | Turn pipeline, openings, stories |
| **NLU** | `nlu/` | `detectIntent`, `detectTopic` |
| **Matching** | `matching/` | Reply scoring, hints, tuning, recovery, pool quality |
| Suggestions | `suggestionCount.ts`, `suggestionBanks.ts` | Pill count + banks |

**Public API:** `@/systems/conversation` (barrel) or `@/systems/conversation/engine`.

```text
processUserMessage → nlu (intent, topic) → pools (DB + lexicon)
  → matching (replyMatcher) → personality blend → EngineResponse
```

### Personality (`systems/personality/`)

Post-process lines by `personalityMode`; does not own pool building.

### Lexicon & language (`systems/lexicon/`, `components/language/`, `utils/japaneseTokens.ts`, …)

Index, lookups, tri-line display, furigana, word tap.

### Learning (`systems/learning/`)

Sentence exposure / repetition avoidance (used by engine).

### Content vs persistence

- **`data/`** — scenarios, UI labels, bundled tuning defaults (no Dexie).
- **`database/`** — Dexie + `importService` loaders from `public/data/*.json`.
- Bump `CURRENT_DATA_VERSION` in `importService` when seed/schema changes.

### App shell

`App.tsx`, layout, onboarding, settings, routing, boot data load.

### Simulation (`simulation/`)

May import `systems/conversation`; **never** the reverse from production code paths.

## Surfaces: chat vs voice

`useNozomiStore` keeps **parallel** sessions: `chatSession` / `voiceSession`, separate messages and suggestions.  
Any new feature must pass surface `'chat' | 'voice'` explicitly (see `useConversation`).

## Import rules

| From → To | Allowed |
|-----------|---------|
| `components/*` → `systems/*` | Yes |
| `systems/speech` → `systems/conversation` | Avoid (use hooks) |
| `systems/conversation` → `systems/speech` | No |
| `systems/*` → `components/*` | **Never** |
| `systems/conversation` → `simulation/*` | **Never** |
| Production → `simulation/*` | **Never** |

## Deprecated paths

Shims at `systems/conversation/intent.ts`, `topic.ts`, `replyMatcher.ts`, etc. re-export from `nlu/` and `matching/`. Prefer:

- `@/systems/conversation/nlu`
- `@/systems/conversation/matching`
- `@/systems/conversation` for engine exports

## Tests per domain

| Area | Location |
|------|----------|
| NLU | `systems/conversation/nlu/*.test.ts` |
| Matching | `systems/conversation/matching/*.test.ts` |
| Engine / suggestions | `systems/conversation/*.test.ts` |
| Voice | `features/voice/logic/*.test.ts` |
| Simulation | `simulation/*.test.ts` |

Run: `npm run test`
