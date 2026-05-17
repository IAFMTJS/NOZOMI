import { ensureLexiconLoaded, getSentencesByFilter, getRandomSentences } from '@/database/importService'
import { STARTER_SUGGESTIONS } from '@/database/seedData'
import { isScenarioIntent } from '@/data/scenarioIntents'
import { lexiconHintsForInput, searchLexiconForTopic } from '@/systems/lexicon/lexiconIndex'
import {
  SUGGESTION_BANKS,
  type ReplyBank,
  type SuggestionInvite,
} from '@/systems/conversation/suggestionBanks'

export type { SuggestionInvite }
import { filterByMaxLevel } from './engineHelpers'
import { filterUnseenSentences } from '@/systems/learning/exposureTracker'
import type { JlptLevel, LanguageText, Sentence, Suggestion } from '@/types/domain'

const INVITE_PATTERNS: { invite: SuggestionInvite; re: RegExp }[] = [
  {
    invite: 'explain_why',
    re: /(どうして|なぜ|どうしたの|why|what happened|何で|なんで|原因|どうだったの|何があった)/i,
  },
  {
    invite: 'explain_what',
    re: /(何が|なにが|what did|what was|どんな|何をした|何があった|どういう)/i,
  },
  {
    invite: 'explain_more',
    re: /(もっと|詳しく|教えて|続けて|tell me more|具体的|他に|続き)/i,
  },
  {
    invite: 'respond_yesno',
    re: /(ですか|ますか|でしょうか|かな[？?]|did you|are you|will you|いいの|よかった)/i,
  },
  {
    invite: 'respond_feeling',
    re: /(そっか|大変|つらい|疲れ|よかった|嬉しい|かわいそう|I'm sorry|that sounds|ひどい|残念)/i,
  },
  {
    invite: 'greeting',
    re: /(こんにちは|おはよう|こんばんは|元気|調子|hello|hi |hey|はじめまして)/i,
  },
]

function bankTopicScore(bank: ReplyBank, topic: string): number {
  if (!bank.topic) return 0
  if (typeof bank.topic === 'string') {
    return bank.topic === topic ? 4 : 0
  }
  return bank.topic.test(topic) ? 4 : 0
}

export function detectSuggestionInvite(
  nozomi: LanguageText,
  recentUserText = '',
  topic = '',
): SuggestionInvite {
  const hay = `${nozomi.jp} ${nozomi.en} ${nozomi.romaji}`.toLowerCase()
  for (const { invite, re } of INVITE_PATTERNS) {
    if (re.test(hay)) return invite
  }
  if (/(bad|tough|tired|sad|awful|rough|大変|疲|つら|最悪)/i.test(recentUserText)) {
    return 'explain_why'
  }
  if (/(happy|fun|good|great|楽し|嬉|よかった)/i.test(recentUserText)) {
    return 'respond_feeling'
  }
  if (isScenarioIntent(topic) && /[?？]/.test(nozomi.jp)) {
    return 'explain_why'
  }
  return 'general'
}

function isUserReplySentence(s: Sentence): boolean {
  const jp = s.jp.trim()
  if (!jp || jp.length > 42) return false
  if (/^(彼|彼女|彼ら)/.test(jp)) return false
  if (/[?？]$/.test(jp) && jp.length < 12) return false
  const firstPerson =
    /^(私|僕|ぼく|わたし|今日|昨日|学校|仕事|友達|うん|はい|いいえ|まあ|ちょっと|実は)/.test(jp)
  const pastEvent = /(た|だ|した|かった|だった|て)$/.test(jp)
  const casual = /(ね|よ|さ)$/.test(jp)
  return firstPerson || pastEvent || casual
}

function scoreUserReplySentence(
  s: Sentence,
  invite: SuggestionInvite,
  hints: { jpHints: string[]; enHints: string[] },
  topic: string,
): number {
  if (!isUserReplySentence(s)) return -1

  let score = 0
  if (s.category === topic || s.category === 'daily') score += 2

  for (const h of hints.jpHints) {
    if (h && s.jp.includes(h)) score += 4
  }
  for (const h of hints.enHints) {
    if (h.length > 2 && s.en.toLowerCase().includes(h)) score += 2
  }

  if (invite === 'explain_why') {
    if (/(学校|友達|仕事|疲|眠|テスト|けんか|忙)/.test(s.jp)) score += 5
    if (s.en.match(/school|friend|work|tired|sleep|test|fight|busy/i)) score += 3
  }
  if (invite === 'explain_what') {
    if (/(した|あった|行った|買った|会った)/.test(s.jp)) score += 4
  }
  if (invite === 'respond_feeling') {
    if (/(うん|そう|でも|ありがと|大丈夫)/.test(s.jp)) score += 4
  }

  if (jpLengthOk(s.jp)) score += 1
  return score
}

function jpLengthOk(jp: string): boolean {
  return jp.length >= 3 && jp.length <= 28
}

function flattenBanks(banks: ReplyBank[], excludeJp: string): Suggestion[] {
  const out: Suggestion[] = []
  for (const bank of banks) {
    for (const r of bank.replies) {
      if (r.jp === excludeJp || !jpLengthOk(r.jp)) continue
      out.push({ ...r, id: r.id ?? `bank-${r.jp}` })
    }
  }
  return out
}

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function pickFromBanks(
  invite: SuggestionInvite,
  topic: string,
  recentUserText: string,
  count: number,
  excludeJp: string,
): Suggestion[] {
  const matching = SUGGESTION_BANKS.filter((b) => b.invite === invite)

  const topicBanks = matching.filter((b) => bankTopicScore(b, topic) > 0)
  const moodBanks = matching.filter(
    (b) => !bankTopicScore(b, topic) && b.userContext?.test(recentUserText),
  )
  const generalBanks = matching.filter((b) => !b.topic && !b.userContext)

  const tiers = [
    shuffle(flattenBanks(topicBanks, excludeJp)),
    shuffle(flattenBanks(moodBanks, excludeJp)),
    shuffle(flattenBanks(generalBanks, excludeJp)),
  ]

  const seen = new Set<string>()
  const out: Suggestion[] = []
  for (const tier of tiers) {
    for (const s of tier) {
      if (seen.has(s.jp)) continue
      seen.add(s.jp)
      out.push(s)
      if (out.length >= count) return out
    }
  }
  return out
}

async function pickFromDatabase(
  topic: string,
  level: JlptLevel,
  invite: SuggestionInvite,
  hintText: string,
  excludeJp: string,
  count: number,
): Promise<Suggestion[]> {
  const maxLen = level === 'N5' ? 28 : level === 'N4' ? 40 : 80
  let pool = filterByMaxLevel(
    filterUnseenSentences(
      await getSentencesByFilter({ category: topic, jlptLevel: level, limit: 40 }),
    ),
    level,
  )
  if (pool.length < count) {
    const extra = filterByMaxLevel(await getRandomSentences(60, level), level)
    const seen = new Set(pool.map((s) => s.id))
    pool = [...pool, ...extra.filter((s) => !seen.has(s.id))]
  }

  const hints = lexiconHintsForInput(hintText)
  const scored = pool
    .map((s) => ({
      s,
      score: scoreUserReplySentence(s, invite, hints, topic),
    }))
    .filter((x) => x.score >= 3 && x.s.jp !== excludeJp && x.s.jp.length <= maxLen)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, count).map(({ s }) => ({
    jp: s.jp,
    romaji: s.romaji,
    en: s.en,
    id: String(s.id),
  }))
}

function lexiconAsSuggestions(
  topic: string,
  level: JlptLevel,
  hintText: string,
  excludeJp: string,
  count: number,
): Suggestion[] {
  const maxLen = level === 'N5' ? 28 : level === 'N4' ? 40 : 80
  return searchLexiconForTopic(topic, level, count * 3)
    .filter((e) => e.jp !== excludeJp && e.jp.length <= maxLen && e.jp.length >= 2)
    .slice(0, count)
    .map((e) => ({
      jp: e.jp,
      romaji: e.romaji,
      en: e.en,
      id: `lex-${e.id}`,
    }))
}

/**
 * Pills the learner can tap to answer Nozomi's last line — not random topic chips.
 */
export async function buildContextualSuggestions(opts: {
  topic: string
  level: JlptLevel
  nozomiMessage: LanguageText
  recentUserText?: string
  count: number
}): Promise<Suggestion[]> {
  const { topic, level, nozomiMessage, count } = opts
  const recentUserText = opts.recentUserText?.trim() ?? ''
  const excludeJp = nozomiMessage.jp.trim()
  const invite = detectSuggestionInvite(nozomiMessage, recentUserText, topic)
  const hintText = `${recentUserText} ${nozomiMessage.jp} ${nozomiMessage.en}`

  const fromBanks = pickFromBanks(invite, topic, recentUserText, count, excludeJp)
  if (fromBanks.length >= count) return fromBanks.slice(0, count)

  const need = count - fromBanks.length
  const fromDb = await pickFromDatabase(
    topic,
    level,
    invite,
    hintText,
    excludeJp,
    need + 2,
  )

  const merged: Suggestion[] = []
  const seen = new Set<string>()
  for (const s of [...fromBanks, ...fromDb]) {
    if (seen.has(s.jp)) continue
    seen.add(s.jp)
    merged.push(s)
    if (merged.length >= count) break
  }

  if (merged.length >= 2) return merged.slice(0, count)

  await ensureLexiconLoaded()
  const lex = lexiconAsSuggestions(topic, level, hintText, excludeJp, count - merged.length)
  for (const s of lex) {
    if (seen.has(s.jp)) continue
    seen.add(s.jp)
    merged.push(s)
    if (merged.length >= count) break
  }

  if (merged.length >= 2) return merged.slice(0, count)
  return STARTER_SUGGESTIONS.slice(0, count)
}

/** @deprecated Use buildContextualSuggestions */
export async function buildSuggestionsForTopic(
  topic: string,
  level: JlptLevel,
  nozomiMessageJp: string,
  count: number,
  recentUserText = '',
): Promise<Suggestion[]> {
  return buildContextualSuggestions({
    topic,
    level,
    nozomiMessage: { jp: nozomiMessageJp, romaji: '', en: '' },
    recentUserText,
    count,
  })
}
