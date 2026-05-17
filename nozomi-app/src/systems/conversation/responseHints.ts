/**
 * Trainable hint rules: when user input matches `re`, boost sentences
 * that contain any of the listed jp/en fragments.
 * Add rows here (and matching tests in replyMatcher.test.ts) to improve replies.
 */
export type ResponseHint = {
  re: RegExp
  jpHints: string[]
  enHints: string[]
}

export const RESPONSE_HINTS: ResponseHint[] = [
  {
    re: /(tired|exhausted|疲|つかれ|眠|お疲れ)/i,
    jpHints: ['疲', 'お疲れ', '休', '大変'],
    enHints: ['tired', 'rest', 'work', 'tough'],
  },
  {
    re: /(sad|upset|悲|寂|つら|しんど)/i,
    jpHints: ['大変', 'そっか', '大丈夫', 'つら'],
    enHints: ['tough', 'sorry', 'understand', 'hard'],
  },
  {
    re: /(happy|glad|楽|嬉|うれ|fun|楽し)/i,
    jpHints: ['楽', 'いい', 'よかった', '嬉'],
    enHints: ['fun', 'glad', 'great', 'nice'],
  },
  {
    re: /(busy|忙|isogashi)/i,
    jpHints: ['忙', '大変', '疲'],
    enHints: ['busy'],
  },
  {
    re: /(hungry|ramen|ラーメン|食|ご飯|食べ|onaka|腹)/i,
    jpHints: ['食', '美味', 'ご飯', 'ラーメン', 'お腹'],
    enHints: ['eat', 'food', 'hungry', 'ramen'],
  },
  {
    re: /(\brain\b|雨|weather|天気)/i,
    jpHints: ['雨', '天気', '寒', '暖'],
    enHints: ['rain', 'weather', 'cold', 'warm'],
  },
  {
    re: /(study|勉強|homework|テスト|exam|learn)/i,
    jpHints: ['勉強', '学', '大変', '頑張'],
    enHints: ['study', 'learn', 'homework', 'exam'],
  },
  {
    re: /(travel|旅行|電車|空港|flight|trip)/i,
    jpHints: ['旅行', '電車', '空港', '駅'],
    enHints: ['travel', 'trip', 'train', 'station'],
  },
  {
    re: /(work|仕事|office|会議|meeting)/i,
    jpHints: ['仕事', '忙', 'お疲れ', '会議'],
    enHints: ['work', 'busy', 'office', 'meeting'],
  },
  {
    re: /(school|学校|class|授業)/i,
    jpHints: ['学校', '勉強', '授業'],
    enHints: ['school', 'class', 'study'],
  },
  {
    re: /(anime|アニメ|game|ゲーム|hobby|趣味)/i,
    jpHints: ['アニメ', 'ゲーム', '趣味', '楽'],
    enHints: ['anime', 'game', 'hobby', 'fun'],
  },
  {
    re: /(cold|hot|暑|寒|暖)/i,
    jpHints: ['暑', '寒', '暖', '天気'],
    enHints: ['cold', 'hot', 'warm', 'weather'],
  },
  {
    re: /(thanks|thank you|ありがと|どうも|grateful)/i,
    jpHints: ['どういたしまして', 'こちらこそ', '嬉', 'どうも'],
    enHints: ['welcome', 'glad', 'thank', 'anytime'],
  },
  {
    re: /(sorry|ごめん|すみません|申し訳)/i,
    jpHints: ['大丈夫', '気に', '心配'],
    enHints: ['okay', 'fine', 'worry', 'alright'],
  },
  {
    re: /(ticket|切符|きっぷ|fare|platform|ホーム|乗り換|改札|which train)/i,
    jpHints: ['切符', '電車', '駅', 'ホーム', '乗り換', '行き'],
    enHints: ['ticket', 'train', 'station', 'platform', 'line'],
  },
  {
    re: /(check.?in|checkout|room key|フロント|reception|荷物|luggage|breakfast)/i,
    jpHints: ['チェック', '部屋', '鍵', '荷物', '朝食', 'フロント'],
    enHints: ['check', 'room', 'key', 'luggage', 'breakfast', 'reception'],
  },
  {
    re: /(date|デート|like you|好き|会いたい|また会|kiss|romantic|彼氏|彼女)/i,
    jpHints: ['会', '嬉', '楽', '好き', 'また', 'デート'],
    enHints: ['meet', 'glad', 'fun', 'like', 'again', 'date'],
  },
  {
    re: /(homework|宿題|exam|テスト|quiz|teacher|先生|class|授業|lesson)/i,
    jpHints: ['宿題', 'テスト', '授業', '先生', '勉強', '難'],
    enHints: ['homework', 'exam', 'class', 'teacher', 'study', 'hard'],
  },
]
