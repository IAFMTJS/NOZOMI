import type { EngineResponse } from '@/types/domain'
import type { SimulatedUser } from '../types'
import { mulberry32 } from '../utils/random'
import { updateEmotion, type EmotionSignals } from './emotionSimulator'
import { generateUserUtterance } from './utteranceGenerator'

export class UserSimulationEngine {
  private rng: () => number
  private turnIndex = 0
  private lastNozomiJp: string[] = []

  constructor(private user: SimulatedUser) {
    this.rng = mulberry32(user.seed)
  }

  get simulatedUser(): SimulatedUser {
    return this.user
  }

  nextUtterance(lastNozomi?: EngineResponse, opening = false): string {
    const text = generateUserUtterance(this.user, this.rng, {
      turnIndex: this.turnIndex,
      lastNozomi,
      opening,
    })
    this.turnIndex += 1
    return text
  }

  reactToNozomiResponse(
    response: EngineResponse,
    signals: Partial<EmotionSignals> = {},
  ): void {
    const repeated =
      this.lastNozomiJp.filter((j) => j === response.message.jp).length >= 1
    this.lastNozomiJp.push(response.message.jp)
    if (this.lastNozomiJp.length > 6) this.lastNozomiJp.shift()

    this.user = {
      ...this.user,
      emotion: updateEmotion(this.user, {
        nozomiRepeated: repeated,
        helpReceived:
          signals.helpReceived ??
          (response.intent === 'help' || response.message.en.toLowerCase().includes('practice')),
        topicAligned: signals.topicAligned,
        turnEngagement: signals.turnEngagement,
      }),
    }
  }

  shouldStopConversation(): boolean {
    return (
      this.user.emotion.boredom > 0.88 ||
      (this.user.emotion.primary === 'frustrated' && this.user.emotion.valence < 0.15)
    )
  }
}
