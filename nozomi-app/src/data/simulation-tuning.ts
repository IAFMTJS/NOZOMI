/**
 * Tuning derived from simulation exports. Regenerate: npm run simulate then apply-insights
 */
export interface TuningHintRule {
  pattern: string
  jpBoost: string[]
}

export interface ConversationTuningData {
  version: number
  avoidJpContains: string[]
  hintRules: TuningHintRule[]
  questionOnShortAck: boolean
}

export const SIMULATION_TUNING: ConversationTuningData = {
  "version": 2,
  "avoidJpContains": [
    "こんにちは！",
    "「沿う」ですね",
    "」ですね。",
    "お早う、こんにちは。",
    "日本へ行きます。",
    "望み、こんにちは。",
    "初めまして、こんにちは。",
    "今日は、こんにちは。",
    "、こんにちは。",
    "くるくる、こんにちは。",
    "」ですね"
  ],
  "hintRules": [
    {
      "pattern": "(わからない|教えて|help|meaning|how do)",
      "jpBoost": [
        "ゆっくり",
        "練習",
        "一緒",
        "意味",
        "例"
      ]
    },
    {
      "pattern": "(bored|つまらない|別の|ところで)",
      "jpBoost": [
        "面白い",
        "他に",
        "好き",
        "趣味",
        "今日"
      ]
    },
    {
      "pattern": "(うん|そう|ok|yeah|mhm)$",
      "jpBoost": [
        "？",
        "どう",
        "何",
        "続け",
        "他に"
      ]
    },
    {
      "pattern": "(疲|忙|大変|tired|busy)",
      "jpBoost": [
        "お疲れ",
        "休",
        "頑張",
        "大変",
        "ゆっくり"
      ]
    },
    {
      "pattern": "(わからない|教えて|help|meaning)",
      "jpBoost": [
        "一度声に出し",
        "て読んでみて",
        "コンタクトす",
        "ると目が乾い",
        "無いって何",
        "僕は彼を相手",
        "にして英語を",
        "練習した"
      ]
    },
    {
      "pattern": "(疲|忙|大変|tired|busy)",
      "jpBoost": [
        "自然に聞こえ",
        "会ったばかり",
        "の患者の下の",
        "世話をするの",
        "隣の部屋で誰",
        "かの話し声が",
        "聞こえる",
        "来週お会いす"
      ]
    },
    {
      "pattern": "(うん|そう|ok|yeah)$",
      "jpBoost": [
        "来年の日本経",
        "済の見通しは",
        "どうでしょう",
        "明日",
        "食事でもどう",
        "明日、食事でもど",
        "夕飯を食べて",
        "いるときに電"
      ]
    }
  ],
  "questionOnShortAck": true
}
