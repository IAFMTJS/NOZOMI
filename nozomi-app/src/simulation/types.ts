import type {
  ConversationTurn,
  EngineResponse,
  ImmersionLevel,
  JlptLevel,
  PersonalityMode,
  ScenarioCategory,
  UserProfile,
} from '@/types/domain'

export type SimEmotion =
  | 'curious'
  | 'happy'
  | 'neutral'
  | 'bored'
  | 'confused'
  | 'frustrated'
  | 'shy'
  | 'excited'

export type ConversationGoal =
  | 'small_talk'
  | 'practice_grammar'
  | 'learn_vocab'
  | 'scenario_roleplay'
  | 'get_help'
  | 'story_follow'
  | 'free_chat'

export type FailureKind =
  | 'dead_end'
  | 'repetition'
  | 'emotional_mismatch'
  | 'tutoring_failure'
  | 'weak_continuation'
  | 'low_engagement'
  | 'retention_risk'

export interface EmotionalState {
  primary: SimEmotion
  valence: number
  arousal: number
  boredom: number
  confusion: number
  engagement: number
}

export interface SimulatedUser {
  id: string
  displayName: string
  profile: UserProfile
  traits: UserTraits
  emotion: EmotionalState
  goal: ConversationGoal
  scenario?: ScenarioCategory
  turnStyle: TurnStyle
  seed: number
}

export interface UserTraits {
  mistakeRate: number
  topicSwitchRate: number
  shortReplyBias: number
  unpredictability: number
  emotionalReactivity: number
  patience: number
}

export interface TurnStyle {
  prefersRomaji: boolean
  prefersEnglish: boolean
  avgLength: 'short' | 'medium' | 'long'
}

export interface PersonalityTemplate {
  id: string
  label: string
  personalityMode: PersonalityMode
  immersionLevel: ImmersionLevel
  traits: Partial<UserTraits>
  defaultGoal: ConversationGoal
  emotionBias: SimEmotion
}

export interface SimulationConfig {
  conversationCount: number
  maxTurnsPerConversation: number
  minTurnsPerConversation: number
  personalities: string[]
  jlptLevels: JlptLevel[]
  goals: ConversationGoal[]
  scenarios?: ScenarioCategory[]
  forcedTopic?: string
  voiceMode?: boolean
  deterministicSeed?: number
  parallelBatchSize?: number
}

export interface TurnLog {
  turnIndex: number
  role: 'user' | 'nozomi'
  text: string
  input?: string
  response?: EngineResponse
  detectedIntent?: string
  detectedTopic?: string
  userEmotion?: EmotionalState
  userGoal?: ConversationGoal
  responseMs: number
  timestamp: number
}

export interface TurnScores {
  immersion: number
  engagement: number
  japaneseCorrectness: number
  continuationQuality: number
  suggestionQuality: number
}

export interface TurnFailure {
  kind: FailureKind
  severity: number
  message: string
  turnIndex: number
}

export interface ConversationScores {
  overall: number
  immersion: number
  engagement: number
  japaneseCorrectness: number
  continuationQuality: number
  suggestionQuality: number
  tutoringQuality: number
  retentionRisk: number
}

export interface SimulatedConversation {
  id: string
  runId: string
  user: SimulatedUser
  turns: TurnLog[]
  context: ConversationTurn[]
  scores: ConversationScores
  failures: TurnFailure[]
  metadata: ConversationMetadata
  createdAt: number
}

export interface ConversationMetadata {
  turnCount: number
  topics: string[]
  intents: string[]
  nozomiSentenceIds: number[]
  endedReason: 'max_turns' | 'farewell' | 'boredom' | 'dead_end' | 'error'
  durationMs: number
}

export interface SimulationRun {
  id: string
  config: SimulationConfig
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: number
  completedAt?: number
  conversationIds: string[]
  aggregateScores?: ConversationScores
  failureClusters?: FailureCluster[]
}

export interface FailureCluster {
  kind: FailureKind
  count: number
  avgSeverity: number
  exampleConversationIds: string[]
}

export interface AnalyticsSnapshot {
  runId: string
  totalConversations: number
  failureClusters: FailureCluster[]
  weakPaths: WeakPath[]
  repetitiveResponses: RepetitionReport[]
  emotionalDropOffs: EmotionalDropOff[]
  retentionRisks: RetentionRiskPoint[]
  tutoringQuality: TutoringQualityReport
  avgScores: ConversationScores
}

export interface WeakPath {
  topic: string
  intent: string
  count: number
  avgContinuation: number
}

export interface RepetitionReport {
  phrase: string
  count: number
  conversationIds: string[]
}

export interface EmotionalDropOff {
  turnIndex: number
  avgEngagementBefore: number
  avgEngagementAfter: number
  count: number
}

export interface RetentionRiskPoint {
  turnIndex: number
  riskScore: number
  count: number
}

export interface TutoringQualityReport {
  helpRequests: number
  helpAddressed: number
  correctionsOffered: number
  grammarTagsInReplies: number
  teacherModeSessions: number
  score: number
}

export interface DatasetRecord {
  conversationId: string
  turns: { user: string; nozomi: string; intent?: string; topic?: string }[]
  scores: ConversationScores
  persona: string
  level: JlptLevel
  goal: ConversationGoal
}

export interface ReplaySession {
  conversationId: string
  currentTurn: number
  playing: boolean
  speed: number
}

export const DEFAULT_SIM_CONFIG: SimulationConfig = {
  conversationCount: 50,
  maxTurnsPerConversation: 12,
  minTurnsPerConversation: 4,
  personalities: ['curious_beginner', 'playful_n4', 'strict_student', 'shy_speaker'],
  jlptLevels: ['N5', 'N4', 'N3'],
  goals: ['small_talk', 'practice_grammar', 'scenario_roleplay', 'get_help'],
  parallelBatchSize: 8,
}
