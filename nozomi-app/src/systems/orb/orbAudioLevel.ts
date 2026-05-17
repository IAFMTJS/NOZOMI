/** Mic level for orb canvas — bypasses React store to avoid re-render / persist churn. */
let level = 0
const listeners = new Set<() => void>()

export function setOrbAudioLevel(n: number): void {
  const next = Math.max(0, Math.min(1, n))
  const prev = level
  level = next
  if (Math.abs(next - prev) < 0.008) return
  for (const fn of listeners) fn()
}

export function getOrbAudioLevel(): number {
  return level
}

export function subscribeOrbAudioLevel(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}

export function resetOrbAudioLevel(): void {
  level = 0
  for (const fn of listeners) fn()
}
