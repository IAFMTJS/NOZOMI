import Dexie, { type Table } from 'dexie'
import type {
  GrammarPattern,
  PersonalityLine,
  Sentence,
  Story,
  StoryBeat,
  VocabEntry,
} from '@/types/domain'

export const DB_VERSION = 2

export class NozomiDatabase extends Dexie {
  sentences!: Table<Sentence, number>
  vocabulary!: Table<VocabEntry, number>
  personalityLines!: Table<PersonalityLine, number>
  grammarPatterns!: Table<GrammarPattern, number>
  stories!: Table<Story, number>
  storyBeats!: Table<StoryBeat, number>
  meta!: Table<{ key: string; value: string }, string>

  constructor() {
    super('nozomi-db')
    this.version(1).stores({
      sentences: 'id, category, jlptLevel',
      vocabulary: 'id, category, jlptLevel, *hiragana',
      storyBeats: 'id, storyId, beatOrder',
      meta: 'key',
    })
    this.version(DB_VERSION).stores({
      sentences: 'id, category, jlptLevel',
      vocabulary: 'id, category, jlptLevel, *hiragana',
      personalityLines: 'id, mode, context',
      grammarPatterns: 'id, difficulty',
      stories: 'id, slug, genre, category',
      storyBeats: 'id, storyId, beatOrder',
      meta: 'key',
    })
  }
}

export const db = new NozomiDatabase()
