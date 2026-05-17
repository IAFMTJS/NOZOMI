import { detectIntent, type Intent } from './intent'
import { detectTopic } from './topic'
import {
  pickByResponseHints,
  pickContextualSentence,
  type MatchContext,
} from './replyMatcher'
import {
  filterQualityPool,
  isGenericGreetingLine,
  prioritizeConversationalPool,
  prioritizeGrammarTagged,
} from './engineHelpers'
import { buildContextualSuggestions } from './contextualSuggestions'
import { resolveSuggestionCount } from './suggestionCount'
import {
  lexiconSentencesForConversation,
  mergeSentencePools,
} from './lexiconPool'
import { lexiconHintsForInput } from '@/systems/lexicon/lexiconIndex'
import {
  getBeatsForStory,
  getFirstBeatForStory,
  getRandomSentences,
  getSentencesByFilter,
  getStoryByCategory,
  getStoryForTopic,
} from '@/database/importService'
import { SEED_SENTENCES } from '@/database/seedData'
import {
  isScenarioIntent,
  SCENARIO_OPENINGS,
} from '@/data/scenarioIntents'
import {
  blendWithPersonality,
  pickPersonalityLine,
} from '@/systems/personality/personalityAdapter'
import { pickRecoveryLine } from './recoveryLines'
import { ensureConversationTuningLoaded } from './conversationTuning'
import { inferGrammarTagsForJp } from '@/utils/grammarTagInference'
import {
  filterUnseenSentences,
  markSentenceExposure,
} from '@/systems/learning/exposureTracker'
import type {
  AppSettings,
  ConversationTurn,
  EngineResponse,
  JlptLevel,
  LanguageText,
  PersonalityMode,
  ScenarioCategory,
  Sentence,
  StorySession,
  UserProfile,
} from '@/types/domain'
import { DEFAULT_SETTINGS } from '@/types/domain'

const JLPT_ORDER: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

function levelIndex(level: JlptLevel): number {
  return JLPT_ORDER.indexOf(level)
}

function pickSentence(
  pool: Sentence[],
  excludeJp: string[],
  rotateIndex?: number,
): Sentence | null {
  const fresh = filterUnseenSentences(pool)
  const candidates = fresh.filter((s) => !excludeJp.includes(s.jp))
  const list = candidates.length ? candidates : fresh
  if (!list.length) return null
  const chosen =
    rotateIndex !== undefined
      ? list[rotateIndex % list.length]!
      : list[Math.floor(Math.random() * list.length)]!
  markSentenceExposure(chosen)
  return chosen
}

function enrichGrammarTags(result: ResolveResult): ResolveResult {
  if (result.grammarTags?.trim()) return result
  const inferred = inferGrammarTagsForJp(result.message.jp)
  return inferred ? { ...result, grammarTags: inferred } : result
}

function toLanguageText(s: Sentence): LanguageText {
  return {
    jp: s.jp,
    romaji: s.romaji?.trim() || '',
    en: s.en,
  }
}

function filterByMaxLevel(pool: Sentence[], maxLevel: JlptLevel): Sentence[] {
  const maxIdx = levelIndex(maxLevel)
  return pool.filter((s) => levelIndex(s.jlptLevel) <= maxIdx)
}

async function poolFor(
  topic: string,
  level: JlptLevel,
  intent: Intent = 'statement',
): Promise<Sentence[]> {
  const byTopic = await getSentencesByFilter({
    category: topic,
    jlptLevel: level,
    limit: 40,
  })
  let pool = byTopic.length >= 3 ? byTopic : await getRandomSentences(30, level)
  pool = filterByMaxLevel(pool, level)

  const lexiconPool = await lexiconSentencesForConversation(
    topic,
    level,
    '',
    intent,
    isScenarioIntent(topic) ? 28 : 12,
  )
  pool = mergeSentencePools(pool, lexiconPool)

  return pool.length ? pool : byTopic
}

type ResolveResult = {
  message: LanguageText
  grammarTags?: string
  sentenceId?: number
}

function boostPoolWithSeeds(
  pool: Sentence[],
  level: JlptLevel,
  topic?: string,
): Sentence[] {
  const maxIdx = levelIndex(level)
  let seeds = SEED_SENTENCES.filter((s) => levelIndex(s.jlptLevel) <= maxIdx)
  if (topic && isScenarioIntent(topic)) {
    seeds = seeds.filter(
      (s) => s.category === topic || s.category === 'greeting',
    )
  }
  const seen = new Set(pool.map((s) => s.id))
  const extra = seeds.filter((s) => !seen.has(s.id))
  if (pool.length >= 24) return pool
  return extra.length ? [...extra, ...pool] : pool
}

function recentIdsFromPool(pool: Sentence[], recentJp: string[]): Set<number> {
  const ids = new Set<number>()
  for (const s of pool) {
    if (recentJp.includes(s.jp)) ids.add(s.id)
  }
  return ids
}

function contextualPick(
  pool: Sentence[],
  input: string,
  intent: Intent,
  topic: string,
  recentJp: string[],
  matchContext: MatchContext,
): Sentence | null {
  const picked = pickContextualSentence(
    pool,
    input,
    intent,
    topic,
    recentJp,
    recentIdsFromPool(pool, recentJp),
    matchContext,
  )
  if (picked) markSentenceExposure(picked)
  return picked
}

const SHORT_USER_ACK = /^(うん|そう|へー|ふーん|まあ|ok|yeah|yep|mhm|…|\.{2,})$/i

async function resolveMessage(
  intent: Intent,
  pool: Sentence[],
  input: string,
  topic: string,
  recentJp: string[],
  mode: PersonalityMode,
  matchContext: MatchContext,
): Promise<ResolveResult> {
  if (intent === 'greeting') {
    const inConversation = recentJp.length > 0
    let greetingPool =
      pool.filter((s) => s.category === 'greeting').length > 0
        ? pool.filter((s) => s.category === 'greeting')
        : pool
    greetingPool = filterQualityPool(greetingPool)
    const echo = new Set([input.trim(), ...recentJp])
    greetingPool = greetingPool.filter((s) => !echo.has(s.jp))
    if (inConversation) {
      greetingPool = greetingPool.filter((s) => !isGenericGreetingLine(s.jp))
    }
    if (greetingPool.length < 3) {
      greetingPool = filterQualityPool(
        pool.filter((s) => !echo.has(s.jp) && !isGenericGreetingLine(s.jp)),
      )
    }
    const picked = contextualPick(
      greetingPool.length ? greetingPool : pool,
      input,
      intent,
      topic,
      recentJp,
      matchContext,
    )
    const message = await blendWithPersonality(
      mode,
      inConversation ? 'general' : 'greeting',
      picked ? toLanguageText(picked) : null,
      inConversation ? 0.08 : 0.12,
    )
    return {
      message,
      grammarTags: picked?.grammarTags,
      sentenceId: picked?.id,
    }
  }

  if (intent === 'farewell') {
    return {
      message: await blendWithPersonality(mode, 'farewell', {
        jp: 'また話そうね。',
        romaji: 'Mata hanasou ne.',
        en: "Let's talk again soon.",
      }),
    }
  }

  if (intent === 'help') {
    const helpPool = prioritizeGrammarTagged(pool)
    const picked = contextualPick(helpPool, input, intent, topic, recentJp, matchContext)
    if (picked) {
      return {
        message: await blendWithPersonality(mode, 'help', toLanguageText(picked)),
        grammarTags: picked.grammarTags,
        sentenceId: picked.id,
      }
    }
    if (mode === 'teacher' || mode === 'strict_tutor') {
      const hint = await pickPersonalityLine(mode, 'grammar_hint')
      if (hint) {
        return {
          message: await blendWithPersonality(mode, 'help', hint, 0.12),
        }
      }
    }
    return {
      message: await blendWithPersonality(mode, 'help', {
        jp: 'ゆっくり話してみて。一緒に練習しよう。',
        romaji: 'Yukkuri hanashite mite. Issho ni renshuu shiyou.',
        en: "Speak slowly — let's practice together.",
      }),
    }
  }

  if (intent === 'feedback') {
    const picked = contextualPick(pool, input, intent, topic, recentJp, matchContext)
    if (picked) {
      return {
        message: await blendWithPersonality(mode, 'general', toLanguageText(picked)),
        grammarTags: picked.grammarTags,
        sentenceId: picked.id,
      }
    }
    return {
      message: await blendWithPersonality(mode, 'general', {
        jp: 'うん、そうだね。',
        romaji: 'Un, sou da ne.',
        en: 'Yeah, I think so too.',
      }),
    }
  }

  const scoringText = [matchContext.recentUserText, input].filter(Boolean).join(' ')
  const hintPick = pickByResponseHints(pool, scoringText, recentJp)
  if (hintPick) {
    markSentenceExposure(hintPick)
    return {
      message: await blendWithPersonality(mode, 'general', toLanguageText(hintPick)),
      grammarTags: hintPick.grammarTags,
      sentenceId: hintPick.id,
    }
  }

  const picked = contextualPick(pool, input, intent, topic, recentJp, matchContext)
  if (picked) {
    return {
      message: await blendWithPersonality(mode, 'general', toLanguageText(picked)),
      grammarTags: picked.grammarTags,
      sentenceId: picked.id,
    }
  }

  const topicLine = pickSentence(
    pool.filter(
      (s) =>
        s.category === topic &&
        s.jp.length <= 42 &&
        !recentJp.includes(s.jp),
    ),
    recentJp,
  )
  if (topicLine) {
    return {
      message: await blendWithPersonality(mode, 'general', toLanguageText(topicLine)),
      grammarTags: topicLine.grammarTags,
      sentenceId: topicLine.id,
    }
  }

  if (SHORT_USER_ACK.test(input.trim())) {
    const questions = pool.filter(
      (s) =>
        /[?？]$/.test(s.jp) &&
        !recentJp.includes(s.jp) &&
        s.jp.length <= 40,
    )
    const engaged = pickSentence(questions, recentJp)
    if (engaged) {
      return {
        message: await blendWithPersonality(mode, 'general', toLanguageText(engaged)),
        grammarTags: engaged.grammarTags,
        sentenceId: engaged.id,
      }
    }
  }

  const recovery = pickRecoveryLine(recentJp, input)
  return {
    message: await blendWithPersonality(mode, 'general', recovery),
  }
}

export async function processUserMessage(
  rawInput: string,
  profile: UserProfile,
  context: ConversationTurn[],
  forcedTopic?: string,
  options?: { suggestionHint?: string; voice?: boolean; settings?: AppSettings },
): Promise<EngineResponse> {
  await ensureConversationTuningLoaded()
  const input = rawInput.trim()
  const voiceMode = options?.voice === true
  const intent = detectIntent(input)
  const topic =
    forcedTopic ??
    detectTopic(
      input,
      context.map((c) => c.topic).filter(Boolean) as string[],
    )
  const level = profile.jlptLevel
  const mode = profile.personalityMode

  let pool = boostPoolWithSeeds(await poolFor(topic, level, intent), level, topic)
  const lexiconFromInput = await lexiconSentencesForConversation(
    topic,
    level,
    input,
    intent,
    20,
  )
  pool = mergeSentencePools(pool, lexiconFromInput)

  if (pool.length < 12) {
    const extra = await getRandomSentences(40, level)
    const seen = new Set(pool.map((s) => s.id))
    pool = boostPoolWithSeeds(
      [...pool, ...extra.filter((s) => !seen.has(s.id))],
      level,
      topic,
    )
  }

  const quality = filterQualityPool(pool)
  pool = prioritizeConversationalPool(quality.length >= 8 ? quality : pool)
  if (voiceMode) {
    pool = boostPoolWithSeeds(pool, level, topic)
  }

  const recentJp = context
    .filter((c) => c.role === 'nozomi')
    .map((c) => c.content)
    .slice(-6)

  const recentUserText = context
    .filter((c) => c.role === 'user')
    .map((c) => c.content)
    .slice(-2)
    .join(' ')

  const recentNozomiText = context
    .filter((c) => c.role === 'nozomi')
    .map((c) => c.content)
    .slice(-1)
    .join(' ')

  const hint = options?.suggestionHint?.trim()
  const contextualUserText = [recentNozomiText, recentUserText, hint, input]
    .filter(Boolean)
    .join(' ')

  const resolved = await resolveMessage(
    intent,
    pool,
    input,
    topic,
    recentJp,
    mode,
    {
      recentUserText: contextualUserText,
      lexiconHints: lexiconHintsForInput(input),
      voiceMode,
    },
  )
  const settings = options?.settings ?? DEFAULT_SETTINGS
  const suggestions = await buildContextualSuggestions({
    topic,
    level,
    nozomiMessage: resolved.message,
    recentUserText: contextualUserText,
    count: resolveSuggestionCount(settings, profile),
  })
  const enriched = enrichGrammarTags(resolved)
  return {
    message: enriched.message,
    suggestions,
    topic,
    intent,
    grammarTags: enriched.grammarTags,
    sentenceId: enriched.sentenceId,
  }
}

export async function createOpeningTurn(
  profile: UserProfile,
  topic = 'daily',
  settings: AppSettings = DEFAULT_SETTINGS,
  rotateIndex = 0,
): Promise<EngineResponse> {
  const pool = await poolFor(topic, profile.jlptLevel, 'greeting')
  const greetingPool = pool.filter((s) => s.category === 'greeting' || s.category === topic)
  const picked = pickSentence(
    greetingPool.length >= 3 ? greetingPool : pool,
    [],
    rotateIndex,
  )
  const message = await blendWithPersonality(
    profile.personalityMode,
    'greeting',
    picked
      ? toLanguageText(picked)
      : {
          jp: '今日はどうだった？',
          romaji: 'Kyou wa dou datta?',
          en: 'How was your day?',
        },
    0.12,
  )
  const suggestions = await buildContextualSuggestions({
    topic,
    level: profile.jlptLevel,
    nozomiMessage: message,
    count: resolveSuggestionCount(settings, profile),
  })
  const openingResult = enrichGrammarTags({
    message,
    grammarTags: picked?.grammarTags,
    sentenceId: picked?.id,
  })
  return {
    message: openingResult.message,
    suggestions,
    topic,
    intent: 'greeting',
    grammarTags: openingResult.grammarTags,
    sentenceId: openingResult.sentenceId,
  }
}

/** Start a guided story for voice or chat (topic-matched from stories DB). */
export async function createStoryOpening(
  profile: UserProfile,
  topic = 'daily',
  settings: AppSettings = DEFAULT_SETTINGS,
): Promise<EngineResponse> {
  const story = await getStoryForTopic(topic)
  if (!story) return createOpeningTurn(profile, topic, settings)

  const beat = await getFirstBeatForStory(story.id)
  if (!beat) return createOpeningTurn(profile, topic, settings)

  const beats = await getBeatsForStory(story.id)
  const storySession: StorySession = {
    storyId: story.id,
    slug: story.slug,
    beatOrder: 1,
    totalBeats: beats.length,
  }
  const message = await blendWithPersonality(
    profile.personalityMode,
    'greeting',
    { jp: beat.jp, romaji: beat.romaji, en: beat.en },
    0.2,
  )
  const suggestions = await buildContextualSuggestions({
    topic: story.category || topic,
    level: profile.jlptLevel,
    nozomiMessage: message,
    count: resolveSuggestionCount(settings, profile),
  })
  return {
    message,
    suggestions,
    topic: story.category || topic,
    intent: 'greeting',
    story: storySession,
  }
}

/** Start a themed conversation (scenario starter) */
export async function createScenarioOpening(
  profile: UserProfile,
  category: ScenarioCategory,
  settings: AppSettings = DEFAULT_SETTINGS,
): Promise<EngineResponse> {
  const story = await getStoryByCategory(category)
  if (story) {
    const beat = await getFirstBeatForStory(story.id)
    if (beat) {
      const beats = await getBeatsForStory(story.id)
      const storySession: StorySession = {
        storyId: story.id,
        slug: story.slug,
        beatOrder: 1,
        totalBeats: beats.length,
      }
      const message = await blendWithPersonality(
        profile.personalityMode,
        'greeting',
        { jp: beat.jp, romaji: beat.romaji, en: beat.en },
        0.2,
      )
      const suggestions = await buildContextualSuggestions({
        topic: category,
        level: profile.jlptLevel,
        nozomiMessage: message,
        count: resolveSuggestionCount(settings, profile),
      })
      return {
        message,
        suggestions,
        topic: category,
        intent: 'greeting',
        story: storySession,
      }
    }
  }

  if (isScenarioIntent(category)) {
    const scenarioPool = mergeSentencePools(
      SEED_SENTENCES.filter(
        (s) =>
          s.category === category &&
          levelIndex(s.jlptLevel) <= levelIndex(profile.jlptLevel),
      ),
      await lexiconSentencesForConversation(
        category,
        profile.jlptLevel,
        '',
        'greeting',
        20,
      ),
    )
    const picked = pickSentence(scenarioPool, [])
    const message = await blendWithPersonality(
      profile.personalityMode,
      'scenario',
      picked ? toLanguageText(picked) : SCENARIO_OPENINGS[category],
    )
    const suggestions = await buildContextualSuggestions({
      topic: category,
      level: profile.jlptLevel,
      nozomiMessage: message,
      count: resolveSuggestionCount(settings, profile),
    })
    return {
      message,
      suggestions,
      topic: category,
      intent: 'greeting',
      grammarTags: picked?.grammarTags,
      sentenceId: picked?.id,
    }
  }

  return createOpeningTurn(profile, category, settings)
}
