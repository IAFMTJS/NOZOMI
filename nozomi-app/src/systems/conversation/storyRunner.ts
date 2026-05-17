import {
  getBeatAtOrder,
  getBeatsForStory,
  getStoryById,
} from '@/database/importService'
import type {
  EngineResponse,
  LanguageText,
  StoryBeat,
  StorySession,
  UserProfile,
} from '@/types/domain'
import { buildContextualSuggestions } from './contextualSuggestions'

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
): Promise<EngineResponse & { story: StorySession }> {
  const beat = await getBeatAtOrder(story.storyId, story.beatOrder)
  const message = beatToText(beat)
  const suggestions = await buildContextualSuggestions({
    topic,
    level: profile.jlptLevel,
    nozomiMessage: message,
    count: profile.immersionLevel === 'beginner' ? 3 : 3,
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
): Promise<{ response: EngineResponse; story: StorySession } | null> {
  const nextOrder = story.beatOrder + 1
  if (nextOrder > story.totalBeats) {
    await getStoryById(story.storyId)
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
      story: { ...story, beatOrder: story.totalBeats },
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
    count: 3,
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
