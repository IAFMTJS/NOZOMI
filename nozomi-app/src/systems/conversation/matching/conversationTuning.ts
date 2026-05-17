import { SIMULATION_TUNING, type ConversationTuningData } from '@/data/simulation-tuning'

let loaded: ConversationTuningData = SIMULATION_TUNING
let fetchAttempted = false

export function getConversationTuning(): ConversationTuningData {
  return loaded
}

export function setConversationTuning(data: ConversationTuningData): void {
  loaded = data
}

/** Optional JSON override from /data/simulation-tuning.json (browser or vitest fetch) */
export async function ensureConversationTuningLoaded(): Promise<void> {
  if (fetchAttempted) return
  fetchAttempted = true
  try {
    const res = await fetch('/data/simulation-tuning.json')
    if (!res.ok) return
    const data = (await res.json()) as ConversationTuningData
    if (data?.version && Array.isArray(data.avoidJpContains)) {
      loaded = data
    }
  } catch {
    /* use bundled defaults */
  }
}

export function tuningPenaltyForSentence(jp: string): number {
  let penalty = 0
  for (const frag of loaded.avoidJpContains) {
    if (frag && jp.includes(frag)) penalty -= 40
  }
  return penalty
}

export function tuningBoostForSentence(
  jp: string,
  scoringText: string,
): number {
  let boost = 0
  for (const rule of loaded.hintRules) {
    try {
      if (!new RegExp(rule.pattern, 'i').test(scoringText)) continue
      for (const hint of rule.jpBoost) {
        if (hint && jp.includes(hint)) boost += 5
      }
    } catch {
      /* invalid pattern in tuning file */
    }
  }
  return boost
}

export function shouldPreferQuestionOnShortAck(userInput: string): boolean {
  if (!loaded.questionOnShortAck) return false
  return /^(うん|そう|へー|ok|yeah|mhm|まあ|…)$/i.test(userInput.trim())
}
