import type { JlptLevel, Sentence } from '@/types/domain'
import { tuningPenaltyForSentence } from './conversationTuning'

const JLPT_ORDER: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

function levelIndex(level: JlptLevel): number {
  return JLPT_ORDER.indexOf(level)
}

export function filterByMaxLevel(pool: Sentence[], maxLevel: JlptLevel): Sentence[] {
  const maxIdx = levelIndex(maxLevel)
  return pool.filter((s) => levelIndex(s.jlptLevel) <= maxIdx)
}

const NARRATIVE_OPENERS = /^(彼は|彼女は|彼ら|その人|当人|彼の|彼女の)/
const LEXICON_ECHO = /^「[^」]{1,12}」ですね[。.]?$/
const GENERIC_GREETING = /^(こんにちは|おはよう|こんばんは)[！!]?$/

/** Short, dialogue-style lines suitable as chat / voice replies. */
export function isConversationalReply(sentence: Sentence): boolean {
  const jp = sentence.jp.trim()
  if (jp.length > 52) return false
  if (NARRATIVE_OPENERS.test(jp)) return false
  if (LEXICON_ECHO.test(jp)) return false
  if (/[。！？]$/.test(jp) && jp.length > 38 && !/[？?]$/.test(jp)) return false
  return true
}

export function isGenericGreetingLine(jp: string): boolean {
  return GENERIC_GREETING.test(jp.trim())
}

export function filterQualityPool(pool: Sentence[]): Sentence[] {
  return pool.filter((s) => {
    if (!isConversationalReply(s)) return false
    if (isGenericGreetingLine(s.jp)) return false
    if (tuningPenaltyForSentence(s.jp) < -24) return false
    return true
  })
}

export function prioritizeConversationalPool(pool: Sentence[]): Sentence[] {
  const short = pool.filter(isConversationalReply)
  const long = pool.filter((s) => !isConversationalReply(s))
  return short.length ? [...short, ...long] : pool
}

/** Surface lines with grammarTags first (tutoring / help turns). */
export function prioritizeGrammarTagged(pool: Sentence[]): Sentence[] {
  const tagged = pool.filter((s) => s.grammarTags?.trim())
  if (tagged.length < 3) return pool
  const rest = pool.filter((s) => !s.grammarTags?.trim())
  return [...tagged, ...rest]
}

