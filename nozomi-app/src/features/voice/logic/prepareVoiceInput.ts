import { lookupLexiconSurface } from '@/systems/lexicon/lexiconIndex'
import { hasJapanese } from '@/utils/romajiLookup'
import { isRomaji, toKana, toRomaji } from 'wanakana'

export type PreparedVoiceInput = {
  /** Cleaned transcript for chat bubbles */
  display: string
  /** Enriched text for intent, topic, and reply matching */
  engine: string
}

const WHOLE_LINE_ALIASES: { re: RegExp; jp: string }[] = [
  { re: /^how are you(\s+doing)?[.!?]*$/i, jp: '元気ですか' },
  { re: /^how was your day[.!?]*$/i, jp: '今日はどうだった' },
  { re: /^what('s| is) up[.!?]*$/i, jp: '元気' },
  { re: /^hello[.!?]*$/i, jp: 'こんにちは' },
  { re: /^hi[.!?]*$/i, jp: 'こんにちは' },
  { re: /^good (morning|afternoon|evening|night)[.!?]*$/i, jp: 'こんにちは' },
  { re: /^thank you(\s+very much)?[.!?]*$/i, jp: 'ありがとう' },
  { re: /^thanks[.!?]*$/i, jp: 'ありがとう' },
  { re: /^(yes|yeah|yep|sure|ok|okay)[.!?]*$/i, jp: 'はい' },
  { re: /^(no|nope|nah)[.!?]*$/i, jp: 'いいえ' },
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
  { re: /^goodbye[.!?]*$/i, jp: 'さようなら' },
  { re: /^excuse me[.!?]*$/i, jp: 'すみません' },
  { re: /^sorry[.!?]*$/i, jp: 'ごめん' },
]

const PHRASE_ALIASES: { re: RegExp; jp: string }[] = [
  { re: /\b(konn?ichiwa|konichiwa|konnichi wa)\b/gi, jp: 'こんにちは' },
  { re: /\b(konbanwa|konbawa|konban wa)\b/gi, jp: 'こんばんは' },
  { re: /\b(ohayou|ohayo|ohayou gozaimasu)\b/gi, jp: 'おはよう' },
  { re: /\b(arigatou|arigato|arigatou gozaimasu)\b/gi, jp: 'ありがとう' },
  { re: /\b(sumimasen|suimasen|sumisen)\b/gi, jp: 'すみません' },
  { re: /\b(gomen|gomennasai|gomen ne)\b/gi, jp: 'ごめん' },
  { re: /\b(mata ne|matane|jaa ne|jaane|mata ashita)\b/gi, jp: 'またね' },
  { re: /\b(genki desu ka|genki des ka|genki)\b/gi, jp: '元気' },
  { re: /\b(o genki desu ka)\b/gi, jp: 'お元気ですか' },
  { re: /\b(tsukare|tsukareta|tsukaret|tsukaremashita)\b/gi, jp: '疲れた' },
  { re: /\b(isogashii|isogashi|busy)\b/gi, jp: '忙しい' },
  { re: /\b(tanoshii|tanoshikatta|tanoshikute|fun)\b/gi, jp: '楽しかった' },
  { re: /\b(raamen|ramen|rahmen)\b/gi, jp: 'ラーメン' },
  { re: /\b(suki desu|suki da|suki)\b/gi, jp: '好き' },
  { re: /\b(kirai desu|kirai)\b/gi, jp: '嫌い' },
  { re: /\b(doushita|dousita|dooshita|what happened)\b/gi, jp: 'どうした' },
  { re: /\b(kyou|kyo|kyou wa)\b/gi, jp: '今日' },
  { re: /\b(kinou|yesterday)\b/gi, jp: '昨日' },
  { re: /\b(ashita|tomorrow)\b/gi, jp: '明日' },
  { re: /\b(ame|rain)\b/gi, jp: '雨' },
  { re: /\b(oshiete|oshiete kudasai|teach me)\b/gi, jp: '教えて' },
  { re: /\b(wakaranai|wakaran|wakari masen)\b/gi, jp: 'わからない' },
  { re: /\b(hai|yes)\b/gi, jp: 'はい' },
  { re: /\b(iie|iiyo|no)\b/gi, jp: 'いいえ' },
  { re: /\b(fine|good|great|okay|alright)\b/gi, jp: 'よかった' },
  { re: /\b(bad|terrible|awful|sucks)\b/gi, jp: '大変' },
  { re: /\b(happy|excited|ureshii)\b/gi, jp: '嬉しい' },
  { re: /\b(sad|lonely|depressed|kanashii)\b/gi, jp: '悲しい' },
  { re: /\b(love|like)\b/gi, jp: '好き' },
  { re: /\b(hate|dislike)\b/gi, jp: '嫌い' },
  { re: /\b(work|job|shigoto)\b/gi, jp: '仕事' },
  { re: /\b(school|class|gakkou)\b/gi, jp: '学校' },
  { re: /\b(weather|tenki|otenki)\b/gi, jp: '天気' },
  { re: /\b(nihongo|japanese)\b/gi, jp: '日本語' },
  { re: /\b(eigo|english)\b/gi, jp: '英語' },
]

const FILLER_PREFIX =
  /^(えーと|あのー?|うーん|えっと|んー+|um+|uh+|er+|hm+|like,?\s*)+[\s,.、。]*/i

const STT_NOISE =
  /\s*(?:the\s+)?(?:uh|um|erm)\s*/gi

function cleanStt(raw: string): string {
  return raw
    .replace(/\u3000/g, ' ')
    .replace(STT_NOISE, ' ')
    .replace(/[。．.]{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchWholeLineAlias(text: string): string | null {
  const trimmed = text.trim()
  for (const { re, jp } of WHOLE_LINE_ALIASES) {
    if (re.test(trimmed)) return jp
  }
  return null
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
  const jp = [...text.matchAll(/[\u3040-\u9fff\u30a0-\u30ff]+/g)].map((m) => m[0])
  return [...latin, ...jp]
}

function enrichWithLexicon(text: string): string {
  const hints = new Set<string>()
  for (const token of tokenizeForLexicon(text)) {
    let probe = token
    if (isRomaji(probe)) {
      const kana = toKana(probe)
      if (kana) probe = kana
    }
    const entry = lookupLexiconSurface(probe) ?? lookupLexiconSurface(token)
    if (entry?.jp) hints.add(entry.jp)
    if (entry?.hiragana) hints.add(entry.hiragana)
    if (entry?.kanji) hints.add(entry.kanji)
  }
  if (!hints.size) return text
  return `${text} ${[...hints].join(' ')}`
}

/** Prefer Japanese surfaces for UI when STT returned only latin/romaji. */
function displayForBubble(display: string, engine: string): string {
  if (hasJapanese(display)) return display
  const whole = matchWholeLineAlias(display)
  if (whole) return whole
  const jpChunks = [...engine.matchAll(/[\u3040-\u9fff\u30a0-\u30ffー]+/g)].map((m) => m[0])
  if (jpChunks.length) {
    const joined = jpChunks.join('')
    if (joined.length >= 2) return joined
  }
  return display
}

function addRomajiKanaHints(engine: string): string {
  const compact = engine.replace(/\s/g, '')
  if (!hasJapanese(engine) && compact.length >= 2 && isRomaji(compact)) {
    const kana = toKana(engine)
    if (kana && kana !== engine) return `${engine} ${kana}`
  }
  if (hasJapanese(engine) && !/[a-z]/i.test(engine)) {
    try {
      const romaji = toRomaji(engine)
      if (romaji && romaji.length >= 2) return `${engine} ${romaji}`
    } catch {
      /* wanakana may fail on mixed strings */
    }
  }
  return engine
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

  const wholeLine = matchWholeLineAlias(display)
  let engine = wholeLine ?? expandPhraseAliases(display)
  engine = addRomajiKanaHints(engine)
  engine = enrichWithLexicon(engine)
  engine = engine.replace(/\s+/g, ' ').trim()

  display = displayForBubble(display, engine)

  return {
    display,
    engine: engine || display,
  }
}
