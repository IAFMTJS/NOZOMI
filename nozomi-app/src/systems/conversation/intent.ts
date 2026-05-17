export type Intent =
  | 'greeting'
  | 'question'
  | 'statement'
  | 'feedback'
  | 'help'
  | 'farewell'
  | 'unknown'

const GREETING =
  /^(hi|hello|hey|hola|hallo|yo|sup|こんにちは|おはよう|こんばんは|やあ|やっほ|おっす)/i
const FAREWELL = /(bye|goodbye|see you|later|さようなら|またね|じゃあね|バイバイ)/i
const HELP =
  /(help|how do|what is|what's|meaning|translate|教えて|どうやって|わからない|意味)/i
const QUESTION =
  /(\?|？|ですか|ますか|かな|かい|what|why|how|when|where|who|which|どう|なに|なぜ|どこ|いつ|誰|何)/i
const FEEDBACK =
  /^(thanks|thank you|thx|nice|cool|awesome|great|ok|okay|yeah|yep|yup|right|exactly|same|true|なるほど|そうそう|いいね|すごい|ありがと|どうも|わかる|そうだね|うん|ね)$/i

const CASUAL_ACK =
  /^(mhm|mm+|uh huh|got it|i see|makes sense|そう|うん|へー|ふーん|まあ)$/i

export function detectIntent(input: string): Intent {
  const t = input.trim().replace(/[!?.。！？]+$/g, '')
  if (!t) return 'unknown'
  if (GREETING.test(t)) return 'greeting'
  if (FAREWELL.test(t)) return 'farewell'
  if (
    FEEDBACK.test(t) ||
    CASUAL_ACK.test(t) ||
    (t.length < 48 &&
      /(ありがと|どうも|いいね|なるほど|わかる|そうだね|嬉しい|楽し)/.test(t))
  ) {
    return 'feedback'
  }
  if (HELP.test(t)) return 'help'
  if (QUESTION.test(t)) return 'question'
  if (t.length < 120) return 'statement'
  return 'statement'
}
