import { DEFAULT_PROFILE } from '@/types/domain'
import type { JlptLevel, ScenarioCategory } from '@/types/domain'
import {
  PERSONALITY_TEMPLATES,
  ALL_PERSONALITY_IDS,
} from '../config/personalityTemplates'
import type {
  ConversationGoal,
  SimulationConfig,
  SimulatedUser,
  UserTraits,
} from '../types'
import { mulberry32, pick, chance, uid } from '../utils/random'
import { initialEmotion } from './emotionSimulator'

const NAMES = [
  'Alex', 'Sam', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Taylor', 'Quinn',
  'Yuki', 'Hana', 'Ken', 'Mika', 'Noah', 'Emma', 'Liam', 'Sora',
]

const DEFAULT_TRAITS: UserTraits = {
  mistakeRate: 0.2,
  topicSwitchRate: 0.2,
  shortReplyBias: 0.35,
  unpredictability: 0.35,
  emotionalReactivity: 0.5,
  patience: 0.6,
}

export interface GenerateUserOptions {
  personalityId?: string
  jlptLevel?: JlptLevel
  goal?: ConversationGoal
  scenario?: ScenarioCategory
  seed?: number
}

export function generateFakeUser(
  rng: () => number,
  options: GenerateUserOptions = {},
): SimulatedUser {
  const personalityId =
    options.personalityId ?? pick(rng, ALL_PERSONALITY_IDS)
  const template = PERSONALITY_TEMPLATES[personalityId] ?? PERSONALITY_TEMPLATES.curious_beginner!
  const jlptLevel = options.jlptLevel ?? pick(rng, ['N5', 'N4', 'N3', 'N2'] as JlptLevel[])
  const goal = options.goal ?? template.defaultGoal

  const traits: UserTraits = {
    ...DEFAULT_TRAITS,
    ...template.traits,
  }

  const seed = options.seed ?? Math.floor(rng() * 1e9)

  return {
    id: uid('simuser', rng),
    displayName: pick(rng, NAMES),
    profile: {
      ...DEFAULT_PROFILE,
      id: uid('profile', rng),
      displayName: pick(rng, NAMES),
      jlptLevel,
      immersionLevel: template.immersionLevel,
      personalityMode: template.personalityMode,
    },
    traits,
    emotion: initialEmotion(template.emotionBias),
    goal,
    scenario: options.scenario,
    turnStyle: {
      prefersRomaji: chance(rng, jlptLevel === 'N5' ? 0.35 : 0.15),
      prefersEnglish: chance(rng, jlptLevel === 'N5' ? 0.4 : 0.2),
      avgLength: traits.shortReplyBias > 0.55 ? 'short' : traits.shortReplyBias > 0.3 ? 'medium' : 'long',
    },
    seed,
  }
}

export function generateUsersForConfig(
  config: SimulationConfig,
  baseSeed?: number,
): SimulatedUser[] {
  const rng = mulberry32(baseSeed ?? config.deterministicSeed ?? Date.now())
  const users: SimulatedUser[] = []

  for (let i = 0; i < config.conversationCount; i++) {
    const personalityId = pick(rng, config.personalities.length ? config.personalities : ALL_PERSONALITY_IDS)
    const jlptLevel = pick(rng, config.jlptLevels)
    const goal = pick(rng, config.goals)
    const scenario =
      config.scenarios?.length && chance(rng, 0.4)
        ? pick(rng, config.scenarios)
        : undefined

    users.push(
      generateFakeUser(rng, {
        personalityId,
        jlptLevel,
        goal,
        scenario,
        seed: Math.floor(rng() * 1e9),
      }),
    )
  }

  return users
}
