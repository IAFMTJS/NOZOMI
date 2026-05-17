import type { ConversationGoal, SimEmotion } from '../types'
import type { ScenarioCategory } from '@/types/domain'

export const OPENERS = [
  'こんにちは',
  'hello',
  'おはよう',
  'hey Nozomi',
  'はじめまして',
]

export const SHORT_ACKS = ['うん', 'そう', 'へー', 'ok', 'nice', 'なるほど', 'mhm', 'yeah']

export const CONFUSED_UTTERANCES = [
  'わからない',
  'what does that mean',
  'もう一度',
  'え？',
  'huh',
  '教えて',
  'how do you say that',
]

export const BORED_UTTERANCES = [
  'うん',
  'そうですね',
  'ok',
  '…',
  'まあ',
  'ねえ別の話しない',
]

export const TOPIC_SWITCHS = [
  'ところで、今日の天気は？',
  'food は好き？',
  '仕事は忙しい？',
  '旅行したい',
  'anime 好き？',
  '週末何してる？',
]

export const QUESTIONS_BY_GOAL: Record<ConversationGoal, string[]> = {
  small_talk: [
    '元気？',
    '今日はどうだった？',
    '趣味は何？',
    '日本語難しい？',
  ],
  practice_grammar: [
    'て形はどう使う？',
    'past tense 教えて',
    'particles が と は 違いは？',
  ],
  learn_vocab: [
    '「美味しい」って何？',
    '新しい単語を教えて',
    'この言葉の意味は？',
  ],
  scenario_roleplay: [
    '切符を買いたい',
    'チェックインお願いします',
    'メニューを見せて',
    '駅はどこ？',
  ],
  get_help: [
    'help me please',
    'わからないです',
    'どう言うの？',
    '意味を教えて',
  ],
  story_follow: ['うん', '続けて', 'then what', 'すごい'],
  free_chat: [
    'そういえば',
    '面白いね',
    'think so?',
    '本当？',
  ],
}

export const MISTAKE_VARIANTS: Record<string, string[]> = {
  'こんにちは': ['konnichiwa', 'konichiwa', 'こんにちわ'],
  '元気？': ['genki?', 'げんき？', '元気ですか'],
  'ありがとう': ['arigato', 'ありがと', 'thx'],
  'わからない': ['wakaranai', 'わかんない', 'idk'],
}

export const SCENARIO_PROMPTS: Partial<Record<ScenarioCategory, string[]>> = {
  train_station: ['切符ください', '何時の電車？', 'この電車どこ行き？'],
  food: ['ラーメン好き', 'おすすめは？', '辛いの大丈夫？'],
  hotel: ['チェックイン', '部屋キー', '朝食は何時？'],
  classroom: ['宿題難しい', 'テストある？', '質問していい？'],
  daily: ['今日忙しい', 'コーヒー飲んだ', '疲れた'],
}

export const FAREWELLS = ['またね', 'bye', 'じゃあね', 'おやすみ']

export function utterancesForEmotion(emotion: SimEmotion): string[] {
  switch (emotion) {
    case 'bored':
      return BORED_UTTERANCES
    case 'confused':
    case 'frustrated':
      return CONFUSED_UTTERANCES
    case 'shy':
      return ['…', 'うん', 'えっと', 'maybe', 'すみません']
    case 'excited':
      return ['すごい！', '本当？！', 'いいね！', 'wow!']
    default:
      return []
  }
}
