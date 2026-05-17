import type { EngineResponse } from '@/types/domain'
import type { SimulatedUser } from '../types'
import { chance, pick } from '../utils/random'
import {
  CONFUSED_UTTERANCES,
  FAREWELLS,
  MISTAKE_VARIANTS,
  OPENERS,
  QUESTIONS_BY_GOAL,
  SCENARIO_PROMPTS,
  SHORT_ACKS,
  TOPIC_SWITCHS,
  utterancesForEmotion,
} from './utteranceBank'

function applyMistake(rng: () => number, text: string, rate: number): string {
  if (!chance(rng, rate)) return text
  const variants = MISTAKE_VARIANTS[text]
  if (variants?.length) return pick(rng, variants)
  if (/[\u3040-\u9fff]/.test(text) && chance(rng, 0.4)) {
    return text.replace(/[\u3040-\u9fff]+/g, (jp) => {
      const romajiMap: Record<string, string> = {
        'こんにちは': 'konnichiwa',
        '元気': 'genki',
        'ありがとう': 'arigato',
        'わからない': 'wakaranai',
      }
      for (const [k, v] of Object.entries(romajiMap)) {
        if (jp.includes(k)) return v
      }
      return jp
    })
  }
  return text
}

function shorten(rng: () => number, text: string, bias: number): string {
  if (!chance(rng, bias)) return text
  const parts = text.split(/[\s、。！？]+/).filter(Boolean)
  if (parts.length <= 1) return pick(rng, SHORT_ACKS)
  return parts[0]!
}

export interface UtteranceContext {
  turnIndex: number
  lastNozomi?: EngineResponse
  opening?: boolean
}

export function generateUserUtterance(
  user: SimulatedUser,
  rng: () => number,
  ctx: UtteranceContext,
): string {
  const { emotion, goal, traits, turnStyle, scenario } = user

  if (ctx.opening || ctx.turnIndex === 0) {
    if (scenario && SCENARIO_PROMPTS[scenario]?.length) {
      return applyMistake(rng, pick(rng, SCENARIO_PROMPTS[scenario]!), traits.mistakeRate)
    }
    return applyMistake(rng, pick(rng, OPENERS), traits.mistakeRate)
  }

  if (emotion.boredom > 0.75 && chance(rng, 0.35)) {
    return pick(rng, FAREWELLS)
  }

  if (emotion.boredom > 0.55 && chance(rng, traits.topicSwitchRate)) {
    return applyMistake(rng, pick(rng, TOPIC_SWITCHS), traits.mistakeRate)
  }

  const emotionLines = utterancesForEmotion(emotion.primary)
  if (emotionLines.length && chance(rng, emotion.confusion * 0.5 + emotion.boredom * 0.3)) {
    return applyMistake(rng, pick(rng, emotionLines), traits.mistakeRate)
  }

  if (chance(rng, traits.shortReplyBias)) {
    const ack = pick(rng, SHORT_ACKS)
    return applyMistake(rng, ack, traits.mistakeRate * 0.5)
  }

  if (goal === 'get_help' && (emotion.confusion > 0.45 || ctx.turnIndex % 4 === 0)) {
    return applyMistake(rng, pick(rng, CONFUSED_UTTERANCES), traits.mistakeRate)
  }

  const goalPool = QUESTIONS_BY_GOAL[goal] ?? QUESTIONS_BY_GOAL.free_chat
  let candidate = pick(rng, goalPool)

  if (ctx.lastNozomi?.message.jp) {
    const nz = ctx.lastNozomi.message.jp
    if (nz.includes('？') || nz.includes('?')) {
      if (chance(rng, 0.55)) {
        candidate = chance(rng, 0.5)
          ? pick(rng, SHORT_ACKS)
          : applyMistake(rng, pick(rng, goalPool), traits.mistakeRate)
      }
    }
    if (ctx.lastNozomi.intent === 'help' && goal === 'get_help') {
      candidate = chance(rng, 0.6) ? 'ありがとう' : pick(rng, goalPool)
    }
  }

  if (turnStyle.prefersEnglish && chance(rng, 0.35)) {
    const enPool = ['yeah', 'cool', 'I see', 'really?', 'tell me more', 'nice']
    candidate = pick(rng, enPool)
  }

  if (turnStyle.prefersRomaji && /[\u3040-\u9fff]/.test(candidate)) {
    candidate = applyMistake(rng, candidate, Math.min(1, traits.mistakeRate + 0.25))
  }

  candidate = applyMistake(rng, candidate, traits.mistakeRate)
  candidate = shorten(rng, candidate, traits.shortReplyBias)

  if (ctx.turnIndex > 0 && chance(rng, traits.unpredictability * 0.25)) {
    candidate = pick(rng, [...TOPIC_SWITCHS, ...QUESTIONS_BY_GOAL[goal], candidate])
  } else if (ctx.turnIndex === 0 && chance(rng, traits.unpredictability * 0.25)) {
    candidate = pick(rng, [...OPENERS, candidate])
  }

  return candidate.trim() || 'うん'
}
