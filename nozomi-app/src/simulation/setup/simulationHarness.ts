import { db } from '@/database/db'
import {
  ensureDataLoaded,
  ensureExtendedDataLoaded,
  ensureLexiconLoaded,
} from '@/database/importService'
import { ensureConversationTuningLoaded } from '@/systems/conversation/conversationTuning'
import { resetExposure } from '@/systems/learning/exposureTracker'

let harnessReady = false

async function ensureTaggedSentenceData(): Promise<void> {
  const count = await db.sentences.count()
  if (count === 0) return
  const sample = await db.sentences.orderBy('id').limit(80).toArray()
  const tagged = sample.filter((s) => s.grammarTags?.trim()).length
  if (tagged >= 10) return
  await db.meta.delete('dataVersion')
  await db.sentences.clear()
}

export async function ensureSimulationReady(): Promise<void> {
  if (harnessReady) return
  await ensureTaggedSentenceData()
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
  resetExposure()
}

export function resetSimulationHarnessForBatch(): void {
  resetExposure()
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
