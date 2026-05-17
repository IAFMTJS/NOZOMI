import type { ReplaySession, SimulatedConversation, TurnLog } from '../types'
import { getConversation } from '../storage/simulationDb'

export class ConversationReplay {
  private session: ReplaySession
  private conversation: SimulatedConversation | null = null

  constructor(conversationId: string) {
    this.session = {
      conversationId,
      currentTurn: 0,
      playing: false,
      speed: 1,
    }
  }

  async load(): Promise<SimulatedConversation | null> {
    this.conversation = (await getConversation(this.session.conversationId)) ?? null
    return this.conversation
  }

  get turns(): TurnLog[] {
    return this.conversation?.turns ?? []
  }

  get state(): ReplaySession {
    return { ...this.session }
  }

  seek(turnIndex: number): TurnLog[] {
    this.session.currentTurn = Math.max(
      0,
      Math.min(turnIndex, (this.conversation?.turns.length ?? 1) - 1),
    )
    return this.visibleTurns()
  }

  visibleTurns(): TurnLog[] {
    if (!this.conversation) return []
    return this.conversation.turns.slice(0, this.session.currentTurn + 1)
  }

  step(): TurnLog | null {
    if (!this.conversation) return null
    if (this.session.currentTurn >= this.conversation.turns.length - 1) {
      this.session.playing = false
      return null
    }
    this.session.currentTurn += 1
    return this.conversation.turns[this.session.currentTurn] ?? null
  }

  async play(
    onTurn?: (turn: TurnLog) => void,
    baseDelayMs = 800,
  ): Promise<void> {
    this.session.playing = true
    while (this.session.playing) {
      const turn = this.step()
      if (!turn) break
      onTurn?.(turn)
      await delay(baseDelayMs / this.session.speed)
    }
  }

  pause(): void {
    this.session.playing = false
  }

  setSpeed(speed: number): void {
    this.session.speed = Math.max(0.25, Math.min(4, speed))
  }

  reset(): void {
    this.session.currentTurn = 0
    this.session.playing = false
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function createReplay(conversationId: string): Promise<ConversationReplay> {
  const replay = new ConversationReplay(conversationId)
  await replay.load()
  return replay
}
