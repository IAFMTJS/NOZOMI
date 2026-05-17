import { writeSync } from 'node:fs'
import type { BatchProgress } from '../runner/batchRunner'
import type { ConversationScores, SimulationRun } from '../types'

const DEFAULT_TOTAL = 1000
const fmt = (n: number) => n.toLocaleString('en-US')

export function resolveSimulationCount(): number {
  const raw = process.env.SIM_CONVERSATION_COUNT
  if (raw === undefined || raw === '') return DEFAULT_TOTAL
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_TOTAL
}

/** True when `npm run simulate` set SIM_CONVERSATION_COUNT (batch test should run). */
export function isSimulationBatchRequested(): boolean {
  return Boolean(process.env.SIM_CONVERSATION_COUNT?.trim())
}

/** Unbuffered so progress shows live during long Vitest runs */
function logLine(message: string): void {
  writeSync(2, `${message}\n`)
}

export function logSimulationStart(count: number): void {
  logLine('')
  logLine('[nozomi simulate] ----------------------------------------')
  logLine(`[nozomi simulate] Starting batch: ${fmt(count)} conversations`)
  logLine('[nozomi simulate] ----------------------------------------')
}

export function createTerminalProgressHandler(total: number) {
  let lastLoggedPct = -1
  const started = Date.now()
  const stepPct = total >= 2000 ? 2 : 5

  return (p: BatchProgress) => {
    if (p.status === 'completed') return

    const pct = total > 0 ? Math.floor((p.completed / total) * 100) : 100
    const shouldLog =
      p.completed <= 16 ||
      p.completed === total ||
      pct >= lastLoggedPct + stepPct

    if (!shouldLog) return
    lastLoggedPct = pct

    const elapsedSec = (Date.now() - started) / 1000
    const elapsed = elapsedSec.toFixed(1)
    const rate = p.completed > 0 ? p.completed / elapsedSec : 0
    const remaining = rate > 0 ? Math.ceil((total - p.completed) / rate) : 0
    const eta = remaining > 0 ? ` · ETA ~${remaining}s` : ''

    logLine(
      `[nozomi simulate] ${fmt(p.completed)} / ${fmt(total)} simulated (${pct}%) · ${elapsed}s${eta}`,
    )
  }
}

export function logSimulationComplete(
  run: SimulationRun,
  scores?: ConversationScores,
): void {
  const elapsed =
    run.completedAt && run.startedAt
      ? ((run.completedAt - run.startedAt) / 1000).toFixed(1)
      : '?'

  logLine('[nozomi simulate] ----------------------------------------')
  logLine(
    `[nozomi simulate] Done: ${fmt(run.conversationIds.length)} conversations in ${elapsed}s`,
  )
  logLine(`[nozomi simulate] Run id: ${run.id}`)
  if (scores) {
    logLine(
      `[nozomi simulate] Avg overall: ${(scores.overall * 100).toFixed(1)}% · engagement ${(scores.engagement * 100).toFixed(1)}% · retention risk ${(scores.retentionRisk * 100).toFixed(1)}%`,
    )
  }
  logLine('[nozomi simulate] View results: /simulation in the app')
  logLine('[nozomi simulate] ----------------------------------------')
  logLine('')
}

/** Vitest timeout: large batches load 8k tagged sentences and need ~1–2 min per 100 convs. */
export function simulationTestTimeoutMs(count: number): number {
  if (count >= 2000) return 0
  return Math.max(900_000, count * 2_000)
}
