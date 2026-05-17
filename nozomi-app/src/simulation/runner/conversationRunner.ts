import {
  createOpeningTurn,
  createScenarioOpening,
  processUserMessage,
} from '@/systems/conversation/engine'
import { detectIntent } from '@/systems/conversation/nlu'
import type { ConversationTurn, EngineResponse } from '@/types/domain'
import { setExposureMode } from '@/systems/learning/exposureTracker'
import {
  evaluateConversation,
  evaluateTurn,
  computeTutoringQuality,
} from '../evaluation/evaluationEngine'
import { detectConversationFailures } from '../failure/failureDetector'
import type {
  ConversationMetadata,
  SimulatedConversation,
  SimulationConfig,
  TurnLog,
  TurnScores,
} from '../types'
import type { SimulatedUser } from '../types'
import { UserSimulationEngine } from '../user/userSimulationEngine'
import { mulberry32, uid } from '../utils/random'
import {
  ensureSimulationReady,
  resetSimulationHarnessForBatch,
} from '../setup/simulationHarness'

export interface RunConversationOptions {
  runId: string
  config: SimulationConfig
  user: SimulatedUser
  conversationIndex?: number
}

export async function runSingleConversation(
  options: RunConversationOptions,
): Promise<SimulatedConversation> {
  await ensureSimulationReady()
  resetSimulationHarnessForBatch()

  try {
  const { runId, config, user } = options
  const rng = mulberry32(user.seed)
  const sim = new UserSimulationEngine(user)
  const started = Date.now()
  const turns: TurnLog[] = []
  const turnScores: TurnScores[] = []
  const context: ConversationTurn[] = []
  const topics: string[] = []
  const intents: string[] = []
  const sentenceIds: number[] = []
  let turnIndex = 0
  let endedReason: ConversationMetadata['endedReason'] = 'max_turns'
  let lastResponse: EngineResponse | undefined

  const maxTurns =
    config.minTurnsPerConversation +
    Math.floor(rng() * (config.maxTurnsPerConversation - config.minTurnsPerConversation + 1))

  let opening: EngineResponse
  if (user.scenario) {
    opening = await createScenarioOpening(user.profile, user.scenario)
  } else {
    opening = await createOpeningTurn(
      user.profile,
      config.forcedTopic ?? 'daily',
      undefined,
      options.conversationIndex ?? 0,
    )
  }

  appendNozomiTurn(turns, turnIndex++, opening, 0, sim.simulatedUser)
  if (opening.topic) topics.push(opening.topic)
  if (opening.intent) intents.push(opening.intent)
  if (opening.sentenceId) sentenceIds.push(opening.sentenceId)
  context.push({
    role: 'nozomi',
    content: opening.message.jp,
    topic: opening.topic,
    intent: opening.intent,
  })
  lastResponse = opening

  for (let i = 0; i < maxTurns; i++) {
    const userInput = sim.nextUtterance(lastResponse, false)
    const userIntent = detectIntent(userInput)
    const t0 = performance.now()

    let response: EngineResponse
    try {
      response = await processUserMessage(
        userInput,
        sim.simulatedUser.profile,
        context,
        config.forcedTopic ?? user.scenario,
        { voice: config.voiceMode },
      )
    } catch {
      endedReason = 'error'
      break
    }

    const responseMs = performance.now() - t0
    if (config.voiceMode && responseMs > 8000) {
      endedReason = 'error'
      break
    }
    const recentNozomi = context
      .filter((c) => c.role === 'nozomi')
      .map((c) => c.content)
      .slice(-4)

    const scores = evaluateTurn(
      sim.simulatedUser,
      userInput,
      response,
      context.at(-1)?.topic,
      recentNozomi,
    )
    turnScores.push(scores)

    sim.reactToNozomiResponse(response, {
      topicAligned: response.topic === context.at(-1)?.topic,
      turnEngagement: scores.engagement,
      helpReceived: response.intent === 'help',
    })

    turns.push({
      turnIndex: turnIndex++,
      role: 'user',
      text: userInput,
      input: userInput,
      detectedIntent: userIntent,
      userEmotion: { ...sim.simulatedUser.emotion },
      userGoal: sim.simulatedUser.goal,
      responseMs: 0,
      timestamp: Date.now(),
    })

    if (userIntent) intents.push(userIntent)
    context.push({
      role: 'user',
      content: userInput,
      intent: userIntent,
    })

    appendNozomiTurn(
      turns,
      turnIndex++,
      response,
      responseMs,
      sim.simulatedUser,
      userInput,
    )

    if (response.topic) topics.push(response.topic)
    if (response.intent) intents.push(response.intent)
    if (response.sentenceId) sentenceIds.push(response.sentenceId)

    context.push({
      role: 'nozomi',
      content: response.message.jp,
      topic: response.topic,
      intent: response.intent,
    })

    lastResponse = response

    if (userIntent === 'farewell') {
      endedReason = 'farewell'
      break
    }
    if (sim.shouldStopConversation()) {
      endedReason = 'boredom'
      break
    }
    if (
      response.message.jp === 'そうですね。もう少し教えてください。' &&
      i >= config.minTurnsPerConversation
    ) {
      endedReason = 'dead_end'
      break
    }
  }

  const tutoringQuality = computeTutoringQuality(turns)
  const conversationScores = evaluateConversation(turns, turnScores, tutoringQuality)
  const failures = detectConversationFailures(turns, conversationScores, sim.simulatedUser)

  const metadata: ConversationMetadata = {
    turnCount: turns.length,
    topics: [...new Set(topics)],
    intents: [...new Set(intents)],
    nozomiSentenceIds: [...new Set(sentenceIds)],
    endedReason,
    durationMs: Date.now() - started,
  }

  return {
    id: uid('conv', rng),
    runId,
    user: sim.simulatedUser,
    turns,
    context,
    scores: conversationScores,
    failures,
    metadata,
    createdAt: Date.now(),
  }
  } finally {
    setExposureMode('app')
  }
}

function appendNozomiTurn(
  turns: TurnLog[],
  turnIndex: number,
  response: EngineResponse,
  responseMs: number,
  user: SimulatedUser,
  input?: string,
): void {
  turns.push({
    turnIndex,
    role: 'nozomi',
    text: response.message.jp,
    input,
    response,
    detectedIntent: response.intent,
    detectedTopic: response.topic,
    userEmotion: { ...user.emotion },
    userGoal: user.goal,
    responseMs,
    timestamp: Date.now(),
  })
}
