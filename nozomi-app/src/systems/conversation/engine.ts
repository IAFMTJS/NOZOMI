import { detectIntent, type Intent } from './intent'
import { detectTopic } from './topic'
import { pickContextualSentence, type MatchContext } from './replyMatcher'
import { buildContextualSuggestions } from './contextualSuggestions'
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
} from '@/database/importService'
import { SEED_SENTENCES } from '@/database/seedData'
import {
  isScenarioIntent,
  SCENARIO_OPENINGS,
} from '@/data/scenarioIntents'
import { blendWithPersonality } from '@/systems/personality/personalityAdapter'
import {
  filterUnseenSentences,
  markSentenceExposure,
} from '@/systems/learning/exposureTracker'
import type {
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

const JLPT_ORDER: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

function levelIndex(level: JlptLevel): number {
  return JLPT_ORDER.indexOf(level)
}

function pickSentence(
  pool: Sentence[],
  excludeJp: string[],
): Sentence | null {
  const fresh = filterUnseenSentences(pool)
  const candidates = fresh.filter((s) => !excludeJp.includes(s.jp))
  const list = candidates.length ? candidates : fresh
  if (!list.length) return null
  const chosen = list[Math.floor(Math.random() * list.length)]
  markSentenceExposure(chosen)
  return chosen
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
  return extra.length ? [...extra, ...pool] : pool
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
    new Set(),
    matchContext,
  )
  if (picked) markSentenceExposure(picked)
  return picked
}

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
    const greetingPool =
      pool.filter((s) => s.category === 'greeting').length > 0
        ? pool.filter((s) => s.category === 'greeting')
        : pool
    const picked = contextualPick(
      greetingPool,
      input,
      intent,
      topic,
      recentJp,
      matchContext,
    )
    const message = await blendWithPersonality(
      mode,
      'greeting',
      picked ? toLanguageText(picked) : null,
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
      jp: 'そうですね。もう少し教えてください。',
      romaji: 'Sou desu ne. Mou sukoshi oshiete kudasai.',
      en: 'I see. Tell me a bit more.',
    }),
  }
}

export async function processUserMessage(
  rawInput: string,
  profile: UserProfile,
  context: ConversationTurn[],
  forcedTopic?: string,
): Promise<EngineResponse> {
  const input = rawInput.trim()
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

  const recentJp = context
    .filter((c) => c.role === 'nozomi')
    .map((c) => c.content)
    .slice(-4)

  const recentUserText = context
    .filter((c) => c.role === 'user')
    .map((c) => c.content)
    .slice(-2)
    .join(' ')

  const resolved = await resolveMessage(
    intent,
    pool,
    input,
    topic,
    recentJp,
    mode,
    { recentUserText, lexiconHints: lexiconHintsForInput(input) },
  )
  const suggestionCount = profile.immersionLevel === 'beginner' ? 3 : 3
  const suggestions = await buildContextualSuggestions({
    topic,
    level,
    nozomiMessage: resolved.message,
    recentUserText: [recentUserText, input].filter(Boolean).join(' '),
    count: suggestionCount,
  })
  return {
    message: resolved.message,
    suggestions,
    topic,
    intent,
    grammarTags: resolved.grammarTags,
    sentenceId: resolved.sentenceId,
  }
}

export async function createOpeningTurn(
  profile: UserProfile,
  topic = 'daily',
): Promise<EngineResponse> {
  const pool = await poolFor(topic, profile.jlptLevel, 'greeting')
  const picked = pickSentence(pool, [])
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
  )
  const suggestions = await buildContextualSuggestions({
    topic,
    level: profile.jlptLevel,
    nozomiMessage: message,
    count: 3,
  })
  return {
    message,
    suggestions,
    topic,
    intent: 'greeting',
    grammarTags: picked?.grammarTags,
    sentenceId: picked?.id,
  }
}

/** Start a themed conversation (scenario starter) */
export async function createScenarioOpening(
  profile: UserProfile,
  category: ScenarioCategory,
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
        count: 3,
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
      count: 3,
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

  return createOpeningTurn(profile, category)
}
