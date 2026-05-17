/** Per-turn latency spans for voice pipeline debugging and simulation. */

export type VoiceTurnSpan =
  | 'listen_start'
  | 'listen_finish'
  | 'stt_done'
  | 'engine_start'
  | 'engine_done'
  | 'tts_start'
  | 'tts_end'
  | 'barge_in'

export type VoiceTurnSpanRecord = {
  span: VoiceTurnSpan
  at: number
  meta?: Record<string, unknown>
}

let turnId = 0
let spans: VoiceTurnSpanRecord[] = []

export function beginVoiceTurnMetrics(): number {
  turnId += 1
  spans = [{ span: 'listen_start', at: performance.now() }]
  return turnId
}

export function markVoiceSpan(span: VoiceTurnSpan, meta?: Record<string, unknown>): void {
  spans.push({ span, at: performance.now(), meta })
}

export function getVoiceTurnSpans(): readonly VoiceTurnSpanRecord[] {
  return spans
}

export function getVoiceTurnDeltas(): Record<string, number> {
  const bySpan = new Map<VoiceTurnSpan, number>()
  for (const s of spans) {
    if (!bySpan.has(s.span)) bySpan.set(s.span, s.at)
  }
  const start = bySpan.get('listen_start') ?? spans[0]?.at ?? 0
  const delta = (span: VoiceTurnSpan) => {
    const t = bySpan.get(span)
    return t != null ? Math.round(t - start) : -1
  }
  return {
    listen_finish: delta('listen_finish'),
    stt_done: delta('stt_done'),
    engine_start: delta('engine_start'),
    engine_done: delta('engine_done'),
    tts_start: delta('tts_start'),
    tts_end: delta('tts_end'),
    barge_in: delta('barge_in'),
  }
}

export function resetVoiceTurnMetrics(): void {
  spans = []
}

export function summarizeLastVoiceTurn(): string {
  const d = getVoiceTurnDeltas()
  const parts = Object.entries(d)
    .filter(([, ms]) => ms >= 0)
    .map(([k, ms]) => `${k}=${ms}ms`)
  return parts.length ? parts.join(' ') : '(no spans)'
}
