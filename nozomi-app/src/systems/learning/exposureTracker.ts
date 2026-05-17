import type { Sentence } from '@/types/domain'

type ExposureScope = {
  seenSentenceIds: Set<number>
  seenJp: Set<string>
}

const appScope: ExposureScope = {
  seenSentenceIds: new Set(),
  seenJp: new Set(),
}

const simulationScope: ExposureScope = {
  seenSentenceIds: new Set(),
  seenJp: new Set(),
}

let activeScope: 'app' | 'simulation' = 'app'

function scope(): ExposureScope {
  return activeScope === 'simulation' ? simulationScope : appScope
}

/** Route engine exposure tracking to simulation-only sets (batch runs). */
export function setExposureMode(mode: 'app' | 'simulation'): void {
  activeScope = mode
}

export function markSentenceExposure(sentence: Pick<Sentence, 'id' | 'jp'>): void {
  const s = scope()
  s.seenSentenceIds.add(sentence.id)
  s.seenJp.add(sentence.jp)
}

export function filterUnseenSentences(pool: Sentence[]): Sentence[] {
  const s = scope()
  const fresh = pool.filter(
    (item) => !s.seenSentenceIds.has(item.id) && !s.seenJp.has(item.jp),
  )
  return fresh.length ? fresh : pool
}

export function resetExposure(): void {
  appScope.seenSentenceIds.clear()
  appScope.seenJp.clear()
}

export function resetSimulationExposure(): void {
  simulationScope.seenSentenceIds.clear()
  simulationScope.seenJp.clear()
}
