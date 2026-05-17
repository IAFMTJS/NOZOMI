import { preferTrilingual } from '@/utils/languageCompleteness'
import { tokenizeJapanese, isJapaneseToken } from '@/utils/japaneseTokens'
import { isScenarioIntent } from '@/data/scenarioIntents'
import { isConversationalReply } from './engineHelpers'
import { RESPONSE_HINTS } from './responseHints'
import type { Intent } from './intent'
import type { Sentence } from '@/types/domain'

export type MatchContext = {
  /** Recent user lines (oldest first) to keep topic/emotion continuity */
  recentUserText?: string
  /** Fragments from JMdict / lexicon lookups on the current input */
  lexiconHints?: { jpHints: string[]; enHints: string[] }
  /** STT input is noisier — accept slightly weaker lexical matches */
  voiceMode?: boolean
}

function tokenizeLatin(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[\s,.!?、。！？]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
}

function collectTokens(input: string): string[] {
  const latin = tokenizeLatin(input)
  const jp = tokenizeJapanese(input)
    .map((t) => t.trim())
    .filter((t) => isJapaneseToken(t) && t.length > 0)
  return [...latin, ...jp]
}

function userSpeaksFirstPerson(input: string): boolean {
  return /(私|僕|ぼく|わたし|\bi\b|\bi'm|\bmy\b)/i.test(input)
}

function conversationalFit(sentence: Sentence, input: string): number {
  let bonus = 0
  const len = sentence.jp.length

  if (len <= 24) bonus += 3
  else if (len <= 40) bonus += 1
  else if (len > 55) bonus -= 4

  if (/[ねよ！？。]$/.test(sentence.jp.trim())) bonus += 1

  const firstPersonReply =
    /^(私|僕|今日|昨日|うん|でも|そう)/.test(sentence.jp) ||
    /^(I |I'm |Today |Yeah |But )/i.test(sentence.en)
  if (firstPersonReply) bonus += 2

  if (userSpeaksFirstPerson(input)) {
    if (/彼は|彼女は|彼ら/.test(sentence.jp) || /\b(He |She |They )/i.test(sentence.en)) {
      bonus -= 5
    }
  }

  return bonus
}

function scoreSentence(
  sentence: Sentence,
  input: string,
  intent: Intent,
  topic: string,
  matchContext: MatchContext = {},
): { total: number; signal: number } {
  let score = 0
  let signal = 0
  const lowerInput = input.toLowerCase()
  const tokens = collectTokens(input)

  score += conversationalFit(sentence, input)
  signal += Math.max(0, conversationalFit(sentence, input))

  if (sentence.category === topic) {
    score += isScenarioIntent(topic) ? 6 : 3
    signal += isScenarioIntent(topic) ? 3 : 1
  }
  if (sentence.category === 'greeting' && intent === 'greeting') {
    score += 8
    signal += 8
  }

  for (const token of tokens) {
    if (sentence.en.toLowerCase().includes(token.toLowerCase())) {
      score += 3
      signal += 3
    }
    if (sentence.romaji.toLowerCase().includes(token.toLowerCase())) {
      score += 2
      signal += 2
    }
    if (sentence.jp.includes(token)) {
      score += 4
      signal += 4
    }
  }

  for (const hint of RESPONSE_HINTS) {
    if (!hint.re.test(input)) continue
    if (hint.jpHints.some((h) => sentence.jp.includes(h))) {
      score += 6
      signal += 6
    }
    if (hint.enHints.some((h) => sentence.en.toLowerCase().includes(h))) {
      score += 4
      signal += 4
    }
  }

  const lex = matchContext.lexiconHints
  if (lex) {
    for (const h of lex.jpHints) {
      if (h.length > 0 && sentence.jp.includes(h)) {
        score += 5
        signal += 5
      }
    }
    for (const h of lex.enHints) {
      if (h.length > 2 && sentence.en.toLowerCase().includes(h)) {
        score += 3
        signal += 3
      }
    }
  }

  if (intent === 'question') {
    if (/[?？]$/.test(sentence.jp) || /ですか|ますか|かな/.test(sentence.jp)) {
      signal += 2
    }
    if (lowerInput.includes('what') && /何|なに|どう/.test(sentence.jp)) {
      score += 4
      signal += 4
    }
    if (lowerInput.includes('why') && /なぜ|どうして/.test(sentence.jp)) {
      score += 4
      signal += 4
    }
    if (lowerInput.includes('how') && /どう|如何/.test(sentence.jp)) {
      score += 3
      signal += 3
    }
  }

  if (intent === 'statement' && /[?？]$/.test(sentence.jp)) score -= 2

  if (intent === 'feedback' && /(そう|なるほど|いいね|よかった|どういたしまして|嬉)/.test(sentence.jp)) {
    score += 5
    signal += 5
  }

  if (isConversationalReply(sentence)) {
    score += 2
    signal += 2
  }

  return { total: score, signal }
}

/** Direct hint→sentence match when fuzzy scoring fails (common for voice / English). */
export function pickByResponseHints(
  pool: Sentence[],
  input: string,
  excludeJp: string[],
): Sentence | null {
  const conversational = pool.filter(isConversationalReply)
  for (const hint of RESPONSE_HINTS) {
    if (!hint.re.test(input)) continue
    const match = conversational.find(
      (s) =>
        !excludeJp.includes(s.jp) &&
        hint.jpHints.some((h) => h.length > 0 && s.jp.includes(h)),
    )
    if (match) return match
  }
  return null
}

export function pickContextualSentence(
  pool: Sentence[],
  input: string,
  intent: Intent,
  topic: string,
  excludeJp: string[],
  recentIds: Set<number>,
  matchContext: MatchContext = {},
): Sentence | null {
  const scoringInput = [matchContext.recentUserText, input].filter(Boolean).join(' ')

  const base = preferTrilingual(pool)
  const candidates = base.filter(
    (s) => !excludeJp.includes(s.jp) && !recentIds.has(s.id),
  )
  let list = candidates.length ? candidates : preferTrilingual(pool)
  if (!list.length) return null

  const conversational = list.filter(isConversationalReply)
  if (conversational.length >= 3) {
    list = conversational
  }

  const scored = list.map((sentence) => ({
    sentence,
    ...scoreSentence(sentence, scoringInput, intent, topic, matchContext),
  }))
  const ranked = scored.sort((a, b) => {
    const totalDiff = b.total - a.total
    if (totalDiff !== 0) return totalDiff
    const signalDiff = b.signal - a.signal
    if (signalDiff !== 0) return signalDiff
    return a.sentence.id - b.sentence.id
  })
  const best = ranked[0]
  if (!best) return null

  if (matchContext.voiceMode) {
    const conversationalBest = ranked.find((r) =>
      isConversationalReply(r.sentence),
    )
    return conversationalBest?.sentence ?? best.sentence
  }

  const lowSignalIntent =
    intent === 'statement' || intent === 'question' || intent === 'unknown'
  if (lowSignalIntent && best.signal < 2) {
    const topicFallback = ranked.find(
      (r) =>
        r.sentence.category === topic &&
        isConversationalReply(r.sentence),
    )
    if (topicFallback && topicFallback.signal >= 1) {
      return topicFallback.sentence
    }
    return null
  }

  return best.sentence
}
