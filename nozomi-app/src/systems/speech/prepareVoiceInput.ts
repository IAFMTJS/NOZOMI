import { lookupLexiconSurface } from '@/systems/lexicon/lexiconIndex'
import { hasJapanese } from '@/utils/romajiLookup'
import { isRomaji, toKana } from 'wanakana'

export type PreparedVoiceInput = {
  /** Cleaned transcript for display and chat bubbles */
  display: string
  /** Enriched text for intent, topic, and reply matching */
  engine: string
}

/** Full-line English / romaji STT → Japanese semantics for matching. */
const WHOLE_LINE_ALIASES: { re: RegExp; jp: string }[] = [
  { re: /^how are you(\s+doing)?[.!?]*$/i, jp: '元気ですか' },
  { re: /^how was your day[.!?]*$/i, jp: '今日はどうだった' },
  { re: /^i'?m (fine|good|okay|ok|alright)[.!?]*$/i, jp: '元気だよ' },
  { re: /^i'?m (tired|exhausted|sleepy)[.!?]*$/i, jp: '疲れた' },
  { re: /^i'?m (busy|swamped)[.!?]*$/i, jp: '忙しい' },
  { re: /^i'?m (hungry|starving)[.!?]*$/i, jp: 'お腹が空いた' },
  { re: /^i (love|like) (ramen|sushi|anime|games?)[.!?]*$/i, jp: '好き' },
  { re: /^(it was |today was )?(good|great|fine|okay|alright)[.!?]*$/i, jp: 'よかった' },
  { re: /^(not bad|pretty good|so-so)[.!?]*$/i, jp: 'まあまあ' },
  { re: /^nothing much[.!?]*$/i, jp: '特にない' },
  { re: /^what about you[.!?]*$/i, jp: '君は' },
  { re: /^see you( later)?[.!?]*$/i, jp: 'またね' },
]

/** Common STT outputs (romaji / misheard) mapped to Japanese for the conversation engine. */
const PHRASE_ALIASES: { re: RegExp; jp: string }[] = [
  { re: /\b(konn?ichiwa|konichiwa)\b/gi, jp: 'こんにちは' },
  { re: /\b(konbanwa|konbawa)\b/gi, jp: 'こんばんは' },
  { re: /\b(ohayou|ohayo)\b/gi, jp: 'おはよう' },
  { re: /\b(arigatou|arigato)\b/gi, jp: 'ありがとう' },
  { re: /\b(sumimasen|suimasen)\b/gi, jp: 'すみません' },
  { re: /\b(gomen|gomennasai)\b/gi, jp: 'ごめん' },
  { re: /\b(mata ne|matane|jaa ne|jaane)\b/gi, jp: 'またね' },
  { re: /\b(genki|genki desu ka)\b/gi, jp: '元気' },
  { re: /\b(tsukare|tsukareta|tsukaret|tired)\b/gi, jp: '疲れた' },
  { re: /\b(isogashii|isogashi|busy)\b/gi, jp: '忙しい' },
  { re: /\b(tanoshii|tanoshikatta|fun)\b/gi, jp: '楽しかった' },
  { re: /\b(raamen|ramen)\b/gi, jp: 'ラーメン' },
  { re: /\b(suki desu|suki)\b/gi, jp: '好き' },
  { re: /\b(doushita|dousita|what happened)\b/gi, jp: 'どうした' },
  { re: /\b(kyou|kyo)\b/gi, jp: '今日' },
  { re: /\b(kinou|yesterday)\b/gi, jp: '昨日' },
  { re: /\b(ame|rain)\b/gi, jp: '雨' },
  { re: /\b(oshiete|teach me)\b/gi, jp: '教えて' },
  { re: /\b(wakaranai|wakaran)\b/gi, jp: 'わからない' },
  { re: /\b(fine|good|great|okay|alright)\b/gi, jp: 'よかった' },
  { re: /\b(bad|terrible|awful|sucks)\b/gi, jp: '大変' },
  { re: /\b(happy|excited)\b/gi, jp: '嬉しい' },
  { re: /\b(sad|lonely|depressed)\b/gi, jp: '悲しい' },
  { re: /\b(love|like)\b/gi, jp: '好き' },
  { re: /\b(hate|dislike)\b/gi, jp: '嫌い' },
  { re: /\b(work|job)\b/gi, jp: '仕事' },
  { re: /\b(school|class)\b/gi, jp: '学校' },
  { re: /\b(weather|tenki)\b/gi, jp: '天気' },
]

const FILLER_PREFIX =
  /^(えーと|あのー?|うーん|えっと|んー+|um+|uh+|er+|hm+|like,?\s*)+[\s,.、。]*/i

function cleanStt(raw: string): string {
  return raw
    .replace(/\u3000/g, ' ')
    .replace(/[。．.]{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
}

function expandWholeLineAliases(text: string): string {
  const trimmed = text.trim()
  for (const { re, jp } of WHOLE_LINE_ALIASES) {
    if (re.test(trimmed)) return jp
  }
  return text
}

function expandPhraseAliases(text: string): string {
  let out = text
  for (const { re, jp } of PHRASE_ALIASES) {
    out = out.replace(re, jp)
  }
  return out
}

function tokenizeForLexicon(text: string): string[] {
  const latin = text
    .toLowerCase()
    .split(/[\s,.!?、。！？]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
  const jp = [...text.matchAll(/[\u3040-\u9fff]+/g)].map((m) => m[0])
  return [...latin, ...jp]
}

/** Add JP surfaces from lexicon so romaji STT still matches sentence pools. */
function enrichWithLexicon(text: string): string {
  const hints = new Set<string>()
  for (const token of tokenizeForLexicon(text)) {
    const entry = lookupLexiconSurface(token)
    if (entry?.jp) hints.add(entry.jp)
    if (entry?.hiragana) hints.add(entry.hiragana)
    if (entry?.kanji) hints.add(entry.kanji)
  }
  if (!hints.size) return text
  return `${text} ${[...hints].join(' ')}`
}

/**
 * Normalize browser / local STT for the conversation engine.
 * Display stays close to what was heard; engine text adds JP hints for matching.
 */
export function prepareVoiceInput(raw: string): PreparedVoiceInput {
  let display = cleanStt(raw)
  if (!display) {
    return { display: '', engine: '' }
  }

  const stripped = display.replace(FILLER_PREFIX, '').trim()
  if (stripped) display = stripped

  let engine = expandWholeLineAliases(display)
  engine = expandPhraseAliases(engine)

  const compact = engine.replace(/\s/g, '')
  if (!hasJapanese(engine) && compact.length >= 2 && isRomaji(compact)) {
    const kana = toKana(engine)
    if (kana && kana !== engine) {
      engine = `${engine} ${kana}`
    }
  }

  engine = enrichWithLexicon(engine)

  return {
    display,
    engine: engine.trim() || display,
  }
}
