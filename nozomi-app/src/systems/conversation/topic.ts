import {
  SCENARIO_INTENTS,
  SCENARIO_TOPIC_KEYWORDS,
  type ScenarioIntent,
} from '@/data/scenarioIntents'

export const TOPIC_KEYWORDS: Record<string, RegExp> = {
  food: /(食|ご飯|ラーメン|寿司|食べ|飲み|料理|food|eat|drink|ramen)/i,
  travel: /(旅行|空港|flight|trip|観光)/i,
  study: /(勉強|学ぶ|日本語|grammar|study|learn|homework)/i,
  health: /(病|痛|疲|元気|health|tired|sick|sleep)/i,
  hobby: /(趣味|ゲーム|音楽|映画|hobby|game|music|anime)/i,
  shopping: /(買|店|ショップ|shop|buy|store)/i,
  daily: /(今日|昨日|仕事|day|work|today|busy)/i,
}

/** Scenario intents are checked first — they are the primary immersion contexts. */
const ORDERED_TOPICS: string[] = [
  ...SCENARIO_INTENTS,
  'food',
  'travel',
  'study',
  'health',
  'hobby',
  'shopping',
  'daily',
]

function matchesTopic(topic: string, input: string): boolean {
  if ((SCENARIO_INTENTS as readonly string[]).includes(topic)) {
    return SCENARIO_TOPIC_KEYWORDS[topic as ScenarioIntent].test(input)
  }
  const re = TOPIC_KEYWORDS[topic]
  return re ? re.test(input) : false
}

export function detectTopic(input: string, previousTopics: string[]): string {
  const activeScenario = previousTopics.find((t) =>
    (SCENARIO_INTENTS as readonly string[]).includes(t),
  )
  if (activeScenario && matchesTopic(activeScenario, input)) {
    return activeScenario
  }

  for (const topic of ORDERED_TOPICS) {
    if (matchesTopic(topic, input)) return topic
  }

  return activeScenario ?? previousTopics[0] ?? 'daily'
}
