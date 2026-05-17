import { getBeatAtOrder, getBeatsForStory } from '@/database/importService'
import type {
  AppSettings,
  EngineResponse,
  LanguageText,
  StoryBeat,
  StorySession,
  UserProfile,
} from '@/types/domain'
import { DEFAULT_SETTINGS } from '@/types/domain'
import { buildContextualSuggestions } from './contextualSuggestions'
import { resolveSuggestionCount } from './suggestionCount'

export async function initStorySession(
  storyId: number,
  slug: string,
): Promise<StorySession | null> {
  const beats = await getBeatsForStory(storyId)
  if (!beats.length) return null
  return {
    storyId,
    slug,
    beatOrder: 1,
    totalBeats: beats.length,
  }
}

export async function getStoryOpening(
  story: StorySession,
  profile: UserProfile,
  topic: string,
  settings: AppSettings = DEFAULT_SETTINGS,
): Promise<EngineResponse & { story: StorySession }> {
  const beat = await getBeatAtOrder(story.storyId, story.beatOrder)
  const message = beatToText(beat)
  const suggestions = await buildContextualSuggestions({
    topic,
    level: profile.jlptLevel,
    nozomiMessage: message,
    count: resolveSuggestionCount(settings, profile),
  })
  return {
    message,
    suggestions,
    topic,
    intent: 'greeting',
    story,
    grammarTags: undefined,
    sentenceId: undefined,
  }
}

export async function advanceStory(
  story: StorySession,
  profile: UserProfile,
  topic: string,
  settings: AppSettings = DEFAULT_SETTINGS,
): Promise<{ response: EngineResponse; story: StorySession | null } | null> {
  if (story.beatOrder >= story.totalBeats) {
    return null
  }

  const nextOrder = story.beatOrder + 1
  if (nextOrder > story.totalBeats) {
    return {
      response: {
        message: {
          jp: 'お話、ありがとう。また続けようね。',
          romaji: 'Ohanashi, arigatou. Mata tsuzukeyou ne.',
          en: 'Thanks for the story. Let’s continue again.',
        },
        suggestions: [],
        topic,
        intent: 'farewell',
      },
      story: null,
    }
  }

  const beat = await getBeatAtOrder(story.storyId, nextOrder)
  if (!beat) return null

  const message = beatToText(beat)
  const updated: StorySession = { ...story, beatOrder: nextOrder }
  const suggestions = await buildContextualSuggestions({
    topic,
    level: profile.jlptLevel,
    nozomiMessage: message,
    count: resolveSuggestionCount(settings, profile),
  })

  return {
    response: {
      message,
      suggestions,
      topic,
      intent: 'statement',
      story: updated,
    },
    story: updated,
  }
}

function beatToText(beat: StoryBeat | undefined): LanguageText {
  if (!beat) {
    return {
      jp: '続けましょう。',
      romaji: 'Tsuzukemashou.',
      en: "Let's continue.",
    }
  }
  return { jp: beat.jp, romaji: beat.romaji, en: beat.en }
}
