export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1'
export type ImmersionLevel = 'beginner' | 'intermediate' | 'advanced'
export type PersonalityMode =
  | 'calm'
  | 'supportive'
  | 'playful'
  | 'teasing'
  | 'philosophical'
  | 'teacher'
  | 'casual_friend'
  | 'strict_tutor'

export type ScenarioCategory =
  | 'train_station'
  | 'hotel'
  | 'dating'
  | 'classroom'
  | 'daily'
  | 'travel'
  | 'food'
  | 'shopping'
  | 'feelings'
  | 'work'
  | 'study'
  | 'hobby'
  | 'health'
  | 'social'
  | 'greeting'

export interface PersonalityLine extends LanguageText {
  id: number
  mode: string
  context: string
}

export interface GrammarPattern {
  id: number
  pattern: string
  meaning: string
  difficulty: string
  examplesJson: string
}

export interface Story {
  id: number
  slug: string
  titleJp: string
  titleEn: string
  description: string
  jlptLevel: JlptLevel
  genre: string
  category: string
}
export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking'
export type SpeechState =
  | 'idle'
  | 'permission_pending'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'error'

export interface LanguageText {
  jp: string
  romaji: string
  en: string
}

export interface Sentence extends LanguageText {
  id: number
  category: string
  jlptLevel: JlptLevel
  grammarTags?: string
  source?: string
}

export interface Suggestion extends LanguageText {
  id?: string
}

export type LexiconEntryType = 'word' | 'particle' | 'verb'

export interface VocabEntry extends LanguageText {
  id: number
  hiragana: string
  kanji?: string
  category: string
  jlptLevel: JlptLevel
  exampleJp?: string
  exampleRomaji?: string
  exampleEn?: string
  entryType?: LexiconEntryType
}

export interface StoryBeat extends LanguageText {
  id: number
  storyId: number
  beatOrder: number
  narration?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'nozomi'
  text: LanguageText
  timestamp: number
  grammarTags?: string
  sentenceId?: number
}

export interface StorySession {
  storyId: number
  slug: string
  beatOrder: number
  totalBeats: number
}

export interface UserProfile {
  id: string
  displayName: string
  jlptLevel: JlptLevel
  immersionLevel: ImmersionLevel
  personalityMode: PersonalityMode
  onboardingComplete: boolean
}

export interface SessionState {
  activeIntent: string
  activeStorySlug?: string
  activeStoryId?: number
  activeStoryBeat?: number
  activeStoryTotalBeats?: number
  activeScenario?: ScenarioCategory
  topicStack: string[]
  turnCount: number
}

export interface ConversationTurn {
  role: 'user' | 'nozomi'
  content: string
  topic?: string
  intent?: string
}

export interface EngineResponse {
  message: LanguageText
  suggestions: Suggestion[]
  topic?: string
  intent?: string
  grammarTags?: string
  sentenceId?: number
  story?: StorySession
}

export type SpeechInputLang = 'auto' | 'ja-JP' | 'en-US' | 'nl-NL'

export interface AppSettings {
  showRomaji: boolean
  showEnglish: boolean
  /** Browser speech-to-text language */
  speechInputLang: SpeechInputLang
  voiceEnabled: boolean
  /** Read reply suggestions aloud when selected (voice mode) */
  suggestionVoiceEnabled: boolean
  voiceRate: number
  voicePitch: number
  /** `auto` picks the best Japanese voice; otherwise a SpeechSynthesis voiceURI. */
  voiceUri: string
  orbIntensity: number
  reducedMotion: boolean
  focusMode: boolean
  suggestionCount: number
  staticOrb: boolean
  favoriteVocabIds: number[]
  /** Voice orb: guided story beats instead of free conversation */
  voiceStoryMode: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  showRomaji: true,
  showEnglish: true,
  speechInputLang: 'auto',
  voiceEnabled: true,
  suggestionVoiceEnabled: false,
  voiceRate: 0.94,
  voicePitch: 1.05,
  voiceUri: 'auto',
  orbIntensity: 1,
  reducedMotion: false,
  focusMode: false,
  suggestionCount: 3,
  staticOrb: false,
  favoriteVocabIds: [],
  voiceStoryMode: false,
}

export const DEFAULT_PROFILE: UserProfile = {
  id: 'default',
  displayName: 'Learner',
  jlptLevel: 'N5',
  immersionLevel: 'beginner',
  personalityMode: 'calm',
  onboardingComplete: false,
}
