import type { EmotionalState, SimEmotion, SimulatedUser } from '../types'
import { clamp } from '../utils/random'

const EMOTION_FROM_VALENCE: { min: number; emotion: SimEmotion }[] = [
  { min: 0.75, emotion: 'excited' },
  { min: 0.55, emotion: 'happy' },
  { min: 0.4, emotion: 'curious' },
  { min: 0.25, emotion: 'neutral' },
  { min: 0.12, emotion: 'shy' },
  { min: 0, emotion: 'bored' },
]

export function initialEmotion(bias: SimEmotion): EmotionalState {
  const base = {
    curious: { valence: 0.55, arousal: 0.5, boredom: 0.1, confusion: 0.15, engagement: 0.6 },
    happy: { valence: 0.7, arousal: 0.55, boredom: 0.05, confusion: 0.1, engagement: 0.75 },
    neutral: { valence: 0.45, arousal: 0.35, boredom: 0.2, confusion: 0.2, engagement: 0.5 },
    bored: { valence: 0.25, arousal: 0.15, boredom: 0.65, confusion: 0.15, engagement: 0.25 },
    confused: { valence: 0.3, arousal: 0.45, boredom: 0.2, confusion: 0.7, engagement: 0.35 },
    frustrated: { valence: 0.15, arousal: 0.7, boredom: 0.25, confusion: 0.55, engagement: 0.3 },
    shy: { valence: 0.4, arousal: 0.25, boredom: 0.15, confusion: 0.35, engagement: 0.4 },
    excited: { valence: 0.8, arousal: 0.75, boredom: 0.05, confusion: 0.1, engagement: 0.85 },
  }[bias]

  return { primary: bias, ...base }
}

function primaryFromState(state: Omit<EmotionalState, 'primary'>): SimEmotion {
  if (state.confusion > 0.65) return 'confused'
  if (state.boredom > 0.6) return 'bored'
  if (state.valence < 0.2 && state.arousal > 0.55) return 'frustrated'
  for (const row of EMOTION_FROM_VALENCE) {
    if (state.valence >= row.min) return row.emotion
  }
  return 'neutral'
}

export interface EmotionSignals {
  nozomiRepeated?: boolean
  helpReceived?: boolean
  topicAligned?: boolean
  userShortReply?: boolean
  turnEngagement?: number
}

export function updateEmotion(
  user: SimulatedUser,
  signals: EmotionSignals,
): EmotionalState {
  const reactivity = user.traits.emotionalReactivity
  const e = { ...user.emotion }

  if (signals.nozomiRepeated) {
    e.boredom = clamp(e.boredom + 0.12 * reactivity, 0, 1)
    e.engagement = clamp(e.engagement - 0.1 * reactivity, 0, 1)
    e.valence = clamp(e.valence - 0.06, 0, 1)
  }

  if (signals.helpReceived) {
    e.confusion = clamp(e.confusion - 0.2 * reactivity, 0, 1)
    e.valence = clamp(e.valence + 0.1, 0, 1)
    e.engagement = clamp(e.engagement + 0.08, 0, 1)
  } else if (user.goal === 'get_help' && signals.turnEngagement !== undefined) {
    e.confusion = clamp(e.confusion + 0.05, 0, 1)
  }

  if (signals.topicAligned) {
    e.engagement = clamp(e.engagement + 0.06, 0, 1)
    e.valence = clamp(e.valence + 0.04, 0, 1)
  }

  if (signals.userShortReply) {
    e.boredom = clamp(e.boredom + 0.04, 0, 1)
  }

  if (signals.turnEngagement !== undefined) {
    const delta = (signals.turnEngagement - 0.5) * 0.15 * reactivity
    e.engagement = clamp(e.engagement + delta, 0, 1)
    e.valence = clamp(e.valence + delta * 0.5, 0, 1)
  }

  e.boredom = clamp(e.boredom + (1 - user.traits.patience) * 0.02, 0, 1)
  e.primary = primaryFromState(e)
  return e
}

export function shouldEndFromEmotion(emotion: EmotionalState): boolean {
  return (
    emotion.boredom > 0.85 ||
    (emotion.primary === 'frustrated' && emotion.valence < 0.12)
  )
}
