/** Mic level for orb canvas — bypasses React store to avoid re-render / persist churn. */
let level = 0
/** Peak-hold envelope for punchier listening visuals (decays each read). */
let peak = 0
const listeners = new Set<() => void>()

export function setOrbAudioLevel(n: number): void {
  const next = Math.max(0, Math.min(1, n))
  const prev = level
  level = next
  peak = Math.max(next, peak)
  if (Math.abs(next - prev) < 0.004 && Math.abs(next - peak) < 0.02) return
  for (const fn of listeners) fn()
}

export function getOrbAudioLevel(): number {
  return level
}

/** Level + peak-hold envelope — decays on each sample (call once per animation frame). */
export function sampleOrbAudioEnvelope(): number {
  const env = Math.max(level, peak)
  peak *= 0.88
  if (peak < 0.008) peak = 0
  return env
}

export function subscribeOrbAudioLevel(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function resetOrbAudioLevel(): void {
  level = 0
  peak = 0
  for (const fn of listeners) fn()
}
