import {
  ensureDataLoaded,
  ensureExtendedDataLoaded,
  ensureLexiconLoaded,
} from '@/database/importService'
import { ensureConversationTuningLoaded } from '@/systems/conversation/matching'
import {
  resetSimulationExposure,
  setExposureMode,
} from '@/systems/learning/exposureTracker'

let harnessReady = false

export async function ensureSimulationReady(): Promise<void> {
  if (harnessReady) return
  await ensureDataLoaded()
  await ensureExtendedDataLoaded()
  await ensureLexiconLoaded()
  await ensureConversationTuningLoaded()
  harnessReady = true
}

/** Force reload on next batch (e.g. after fill-grammar-tags). */
export function invalidateSimulationHarness(): void {
  harnessReady = false
}

export function resetSimulationHarness(): void {
  resetSimulationExposure()
}

export function resetSimulationHarnessForBatch(): void {
  resetSimulationExposure()
  setExposureMode('simulation')
}

export function seedRandomForSimulation(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
