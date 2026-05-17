import type { LanguageText, ScenarioCategory } from '@/types/domain'
import { SCENARIO_INTENTS } from '@/data/scenarioIntents'

export interface ScenarioOption {
  id: ScenarioCategory
  label: LanguageText
  icon: string
}

const SCENARIO_LABELS: Record<
  (typeof SCENARIO_INTENTS)[number],
  { label: LanguageText; icon: string }
> = {
  train_station: {
    label: { jp: '駅', romaji: 'Eki', en: 'Train station' },
    icon: '🚉',
  },
  hotel: {
    label: { jp: 'ホテル', romaji: 'Hoteru', en: 'Hotel' },
    icon: '🏨',
  },
  dating: {
    label: { jp: 'デート', romaji: 'Deeto', en: 'Dating' },
    icon: '💫',
  },
  classroom: {
    label: { jp: '教室', romaji: 'Kyoushitsu', en: 'Classroom' },
    icon: '📖',
  },
  daily: {
    label: { jp: '日常', romaji: 'Nichijou', en: 'Daily life' },
    icon: '☀️',
  },
  food: {
    label: { jp: '食事', romaji: 'Shokuji', en: 'Food' },
    icon: '🍜',
  },
  travel: {
    label: { jp: '旅行', romaji: 'Ryokou', en: 'Travel' },
    icon: '✈️',
  },
  shopping: {
    label: { jp: '買い物', romaji: 'Kaimono', en: 'Shopping' },
    icon: '🛍️',
  },
  health: {
    label: { jp: '健康', romaji: 'Kenkou', en: 'Health' },
    icon: '🏥',
  },
}

export const SCENARIO_OPTIONS: ScenarioOption[] = SCENARIO_INTENTS.map((id) => ({
  id,
  ...SCENARIO_LABELS[id],
}))
