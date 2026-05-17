import type { LanguageText, ScenarioCategory } from '@/types/domain'

/** Immersion scenarios exposed in the scenario picker. */
export const SCENARIO_INTENTS = [
  'train_station',
  'hotel',
  'dating',
  'classroom',
  'daily',
  'food',
  'travel',
  'shopping',
  'health',
] as const satisfies readonly ScenarioCategory[]

export type ScenarioIntent = (typeof SCENARIO_INTENTS)[number]

export function isScenarioIntent(topic: string): topic is ScenarioIntent {
  return (SCENARIO_INTENTS as readonly string[]).includes(topic)
}

/** Keyword routing: meaning + phrasing + JP/EN/casual variants. */
export const SCENARIO_TOPIC_KEYWORDS: Record<ScenarioIntent, RegExp> = {
  train_station:
    /(駅|電車|ホーム|切符|きっぷ|乗り換|改札|platform|station|train|ticket|line|departure|arrival|新幹線|地下鉄)/i,
  hotel:
    /(ホテル|hotel|チェックイン|check.?in|checkout|部屋|room|フロント|reception|鍵|key|荷物|luggage|朝食|breakfast|wifi|wi-?fi|予約|reservation)/i,
  dating:
    /(デート|date|付き合|恋人|彼氏|彼女|好き|like you|crush|romantic|kiss|会いたい|また会|カフェで会|映画)/i,
  classroom:
    /(教室|授業|クラス|classroom|class|先生|teacher|宿題|homework|テスト|exam|quiz|学校|school|勉強|study|ノート|黒板)/i,
  daily:
    /(今日|昨日|朝|夜|週末|仕事|会社|家|routine|daily|weekend|morning|evening|tired|疲れ)/i,
  food:
    /(食べ|料理|レストラン|カフェ|ラーメン|寿司|ご飯|朝食|昼食|夕食|food|eat|restaurant|cafe|coffee|hungry|お腹)/i,
  travel:
    /(旅行|観光|空港|飛行機|荷物|パスポート|travel|trip|vacation|sightseeing|tour|旅)/i,
  shopping:
    /(買い物|ショップ|店|値段|安い|高い|shopping|buy|store|price|sale|レジ)/i,
  health:
    /(病院|医者|薬|熱|頭痛|風邪|health|doctor|hospital|sick|pain|症状)/i,
}

/** Short companion-style openers when no story beat exists for the scenario. */
export const SCENARIO_OPENINGS: Record<ScenarioIntent, LanguageText> = {
  train_station: {
    jp: '駅だね。どこに行くの？',
    romaji: 'Eki da ne. Doko ni iku no?',
    en: "We're at the station. Where are you headed?",
  },
  hotel: {
    jp: 'ホテルに着いたね。チェックインする？',
    romaji: 'Hoteru ni tsuita ne. Chekkuin suru?',
    en: "We've arrived at the hotel. Ready to check in?",
  },
  dating: {
    jp: '会えて嬉しい。今日はどうだった？',
    romaji: 'Aete ureshii. Kyou wa dou datta?',
    en: "I'm glad we could meet. How was your day?",
  },
  classroom: {
    jp: '授業お疲れさま。今日は難しかった？',
    romaji: 'Jugyou otsukaresama. Kyou wa muzukashikatta?',
    en: 'Good work in class today. Was it difficult?',
  },
  daily: {
    jp: '今日はどうだった？',
    romaji: 'Kyou wa dou datta?',
    en: 'How was your day?',
  },
  food: {
    jp: 'お腹すいた？何食べたい？',
    romaji: 'Onaka suita? Nani tabetai?',
    en: 'Hungry? What do you want to eat?',
  },
  travel: {
    jp: 'どこに行きたい？',
    romaji: 'Doko ni ikitai?',
    en: 'Where do you want to go?',
  },
  shopping: {
    jp: '何を買いたい？',
    romaji: 'Nani wo kaitai?',
    en: 'What do you want to buy?',
  },
  health: {
    jp: '大丈夫？どこが痛い？',
    romaji: 'Daijoubu? Doko ga itai?',
    en: 'Are you okay? Where does it hurt?',
  },
}
