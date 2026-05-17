import type { LanguageText } from '@/types/domain'

export type UiLabelKey =
  | 'appName'
  | 'readyToTalk'
  | 'pleaseSpeak'
  | 'feelFreeToSpeak'
  | 'type'
  | 'speak'
  | 'suggestions'
  | 'listening'
  | 'listeningJp'
  | 'listeningEn'
  | 'stop'
  | 'doneSpeaking'
  | 'continueTalking'
  | 'openChat'
  | 'conversation'
  | 'send'
  | 'typeMessage'
  | 'words'
  | 'exampleSentence'
  | 'relatedWords'
  | 'practiceWord'
  | 'settings'
  | 'onboardingWelcome'
  | 'onboardingDesc'
  | 'chooseLevel'
  | 'chooseTone'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'startChat'
  | 'micDenied'
  | 'micDeniedEn'
  | 'micNetwork'
  | 'micNeedsHttps'
  | 'micRetry'
  | 'noSpeech'
  | 'heardYou'
  | 'processingSpeech'
  | 'saySomething'
  | 'tapOrbToSpeak'
  | 'tapOrbToStop'
  | 'motionReduce'
  | 'focusMode'
  | 'showRomaji'
  | 'showEnglish'
  | 'voiceSpeed'
  | 'voicePitch'
  | 'voiceEnabled'
  | 'speechInputLang'
  | 'speechLangAuto'
  | 'speechLangJa'
  | 'speechLangEn'
  | 'speechLangNl'
  | 'sttEngine'
  | 'sttEngineLocal'
  | 'sttEngineBrowser'
  | 'suggestionCount'
  | 'staticOrb'
  | 'orbIntensity'
  | 'continue'
  | 'next'
  | 'chooseScenario'
  | 'toneCalm'
  | 'toneSupportive'
  | 'tonePlayful'
  | 'toneTeasing'
  | 'tonePhilosophical'
  | 'toneTeacher'
  | 'tapForTranslation'
  | 'storyProgress'
  | 'loading'
  | 'chooseInput'
  | 'inputVoice'
  | 'inputText'
  | 'inputBoth'
  | 'allowMic'
  | 'micReady'
  | 'onboardingReady'
  | 'tapForTranslation'
  | 'tapWordHint'
  | 'contextPanel'
  | 'contextPanelEmpty'
  | 'favorite'
  | 'unfavorite'

export const UI_LABELS: Record<UiLabelKey, LanguageText> = {
  appName: { jp: 'ノゾミ', romaji: 'Nozomi', en: 'Nozomi' },
  readyToTalk: {
    jp: '話す準備はできた？',
    romaji: 'Hanasu junbi wa dekita?',
    en: 'Ready to talk?',
  },
  pleaseSpeak: {
    jp: '話しかけてください',
    romaji: 'Hanashikakete kudasai',
    en: 'Please speak to me',
  },
  feelFreeToSpeak: {
    jp: '自由に話してください',
    romaji: 'Jiyuu ni hanashite kudasai',
    en: 'Feel free to speak',
  },
  type: { jp: '入力', romaji: 'Nyuuryoku', en: 'Type' },
  speak: { jp: '話す', romaji: 'Hanasu', en: 'Speak' },
  suggestions: { jp: '提案', romaji: 'Teian', en: 'Suggestions' },
  listening: {
    jp: '聞いています…',
    romaji: 'Kiite imasu…',
    en: "I'm listening…",
  },
  listeningJp: { jp: '聞いています…', romaji: 'Kiite imasu…', en: '' },
  listeningEn: { jp: '', romaji: '', en: "I'm listening…" },
  stop: { jp: '停止', romaji: 'Teishi', en: 'Stop' },
  doneSpeaking: {
    jp: '話し終わり',
    romaji: 'Hanashi owari',
    en: 'Done speaking',
  },
  continueTalking: {
    jp: 'もう一度話す',
    romaji: 'Mou ichido hanasu',
    en: 'Speak again',
  },
  openChat: {
    jp: 'チャットを開く',
    romaji: 'Chatto wo hiraku',
    en: 'Open chat',
  },
  conversation: {
    jp: '会話',
    romaji: 'Kaiwa',
    en: 'Conversation',
  },
  send: { jp: '送信', romaji: 'Soushin', en: 'Send' },
  typeMessage: {
    jp: 'メッセージを入力…',
    romaji: 'Messeeji wo nyuuryoku…',
    en: 'Type a message…',
  },
  words: { jp: '単語', romaji: 'Tango', en: 'Words' },
  exampleSentence: {
    jp: '例文',
    romaji: 'Reibun',
    en: 'Example sentence',
  },
  relatedWords: {
    jp: '関連語',
    romaji: 'Kanrengo',
    en: 'Related words',
  },
  practiceWord: {
    jp: 'この単語を練習',
    romaji: 'Kono tango wo renshuu',
    en: 'Practice this word',
  },
  settings: { jp: '設定', romaji: 'Settei', en: 'Settings' },
  onboardingWelcome: {
    jp: 'ノゾミへようこそ',
    romaji: 'Nozomi e youkoso',
    en: 'Welcome to Nozomi',
  },
  onboardingDesc: {
    jp: '自然な会話で日本語を学びましょう',
    romaji: 'Shizen na kaiwa de nihongo wo manabimashou',
    en: 'Learn Japanese through natural conversation',
  },
  chooseLevel: {
    jp: 'レベルを選ぶ',
    romaji: 'Reberu wo erabu',
    en: 'Choose your level',
  },
  chooseTone: {
    jp: 'トーンを選ぶ',
    romaji: 'Toon wo erabu',
    en: 'Choose a tone',
  },
  beginner: { jp: '初級', romaji: 'Shokyuu', en: 'Beginner' },
  intermediate: { jp: '中級', romaji: 'Chuukyuu', en: 'Intermediate' },
  advanced: { jp: '上級', romaji: 'Joukyuu', en: 'Advanced' },
  startChat: {
    jp: '会話を始める',
    romaji: 'Kaiwa wo hajimeru',
    en: 'Start conversation',
  },
  micDenied: {
    jp: 'マイクが使えません',
    romaji: 'Maiku ga tsukaemasen',
    en: 'Microphone cannot be used',
  },
  micDeniedEn: {
    jp: 'マイクの許可を確認するか、文字入力を使ってください。',
    romaji: 'Maiku no kyoka wo kakunin suru ka, moji nyuuryoku wo tsukatte kudasai.',
    en: 'Please allow microphone access or use text input.',
  },
  micNetwork: {
    jp: '音声認識にはインターネット接続が必要です（ChromeまたはEdge）。',
    romaji: 'Onsei ninshiki ni wa intaanetto setsuzoku ga hitsuyou desu.',
    en: 'Speech recognition needs internet (use Chrome or Edge on desktop).',
  },
  micNeedsHttps: {
    jp: 'スマホでマイクを使うには HTTPS が必要です。PC では npm run dev を使い、https://あなたのIP:5173 を開いてください。',
    romaji: 'Sumaho de maiku ni wa HTTPS ga hitsuyou desu.',
    en: 'Microphone on your phone needs HTTPS. On your PC run npm run dev, then open https://YOUR-IP:5173 (accept the certificate warning).',
  },
  micRetry: {
    jp: 'もう一度試す',
    romaji: 'Mou ichido tamesu',
    en: 'Try again',
  },
  noSpeech: {
    jp: '音声が聞こえませんでした',
    romaji: 'Onsei ga kikoenakatta',
    en: 'No speech detected',
  },
  heardYou: {
    jp: '聞こえました',
    romaji: 'Kikoemashita',
    en: 'I heard',
  },
  processingSpeech: {
    jp: '考えています…',
    romaji: 'Kangaete imasu…',
    en: 'Thinking about your message…',
  },
  saySomething: {
    jp: '何か話してみて',
    romaji: 'Nanika hanashite mite',
    en: 'Say something to begin',
  },
  tapOrbToSpeak: {
    jp: 'オーブをタップして話す',
    romaji: 'Oobu wo tappu shite hanasu',
    en: 'Tap the orb to speak',
  },
  tapOrbToStop: {
    jp: 'オーブをタップして終了',
    romaji: 'Oobu wo tappu shite shuuryou',
    en: 'Tap the orb when done',
  },
  motionReduce: {
    jp: '動きを減らす',
    romaji: 'Ugoki wo herasu',
    en: 'Reduce motion',
  },
  focusMode: {
    jp: '集中モード',
    romaji: 'Shuuchuu mode',
    en: 'Focus mode',
  },
  showRomaji: {
    jp: 'ローマ字を表示',
    romaji: 'Roomaji wo hyouji',
    en: 'Show romaji',
  },
  showEnglish: {
    jp: '英語を表示',
    romaji: 'Eigo wo hyouji',
    en: 'Show English',
  },
  voiceSpeed: {
    jp: '声の速さ',
    romaji: 'Koe no hayasa',
    en: 'Voice speed',
  },
  voicePitch: {
    jp: '声の高さ',
    romaji: 'Koe no takasa',
    en: 'Voice pitch',
  },
  voiceEnabled: {
    jp: '声を再生',
    romaji: 'Koe wo saisei',
    en: 'Play Nozomi voice',
  },
  speechInputLang: {
    jp: '音声入力の言語',
    romaji: 'Onsei nyuuryoku no gengo',
    en: 'Speech input language',
  },
  speechLangAuto: {
    jp: '自動（日本語優先）',
    romaji: 'Jidou (Nihongo yuusen)',
    en: 'Auto (Japanese first)',
  },
  speechLangJa: {
    jp: '日本語',
    romaji: 'Nihongo',
    en: 'Japanese',
  },
  speechLangEn: {
    jp: '英語',
    romaji: 'Eigo',
    en: 'English',
  },
  speechLangNl: {
    jp: 'オランダ語',
    romaji: 'Oranda-go',
    en: 'Dutch',
  },
  sttEngine: {
    jp: '音声認識エンジン',
    romaji: 'Onsei ninshiki enjin',
    en: 'Speech recognition engine',
  },
  sttEngineLocal: {
    jp: 'ローカル（PC向け）',
    romaji: 'Rokaru (PC muke)',
    en: 'Local (desktop)',
  },
  sttEngineBrowser: {
    jp: 'ブラウザ標準（スマホ推奨）',
    romaji: 'Burauza hyoujun (sumaho suishou)',
    en: 'Browser built-in (mobile)',
  },
  suggestionCount: {
    jp: '提案の数',
    romaji: 'Teian no kazu',
    en: 'Suggestion count',
  },
  staticOrb: {
    jp: '静止オーブ',
    romaji: 'Seishi oobu',
    en: 'Static orb',
  },
  orbIntensity: {
    jp: 'オーブの明るさ',
    romaji: 'Oobu no akarusa',
    en: 'Orb intensity',
  },
  continue: {
    jp: '続ける',
    romaji: 'Tsuzukeru',
    en: 'Continue',
  },
  next: {
    jp: '次へ',
    romaji: 'Tsugi e',
    en: 'Next',
  },
  chooseScenario: {
    jp: 'シナリオを選ぶ',
    romaji: 'Shinario wo erabu',
    en: 'Choose a scenario',
  },
  toneCalm: { jp: '穏やか', romaji: 'Odayaka', en: 'Calm' },
  toneSupportive: { jp: '支える', romaji: 'Sasaeru', en: 'Supportive' },
  tonePlayful: { jp: '遊び心', romaji: 'Asobigokoro', en: 'Playful' },
  toneTeasing: { jp: 'からかう', romaji: 'Karakau', en: 'Teasing' },
  tonePhilosophical: {
    jp: '哲学的',
    romaji: 'Tetsugakuteki',
    en: 'Philosophical',
  },
  toneTeacher: { jp: '先生', romaji: 'Sensei', en: 'Teacher' },
  chooseInput: {
    jp: 'どう話しますか？',
    romaji: 'Dou hanashimasu ka?',
    en: 'How do you want to talk?',
  },
  inputVoice: {
    jp: '声で話す',
    romaji: 'Koe de hanasu',
    en: 'Speak with voice',
  },
  inputText: {
    jp: '文字で入力',
    romaji: 'Moji de nyuuryoku',
    en: 'Type messages',
  },
  inputBoth: {
    jp: '両方',
    romaji: 'Ryouhou',
    en: 'Both voice and text',
  },
  allowMic: {
    jp: 'マイクを許可',
    romaji: 'Maiku wo kyoka',
    en: 'Allow microphone',
  },
  micReady: {
    jp: 'マイクOK',
    romaji: 'Maiku OK',
    en: 'Microphone ready',
  },
  onboardingReady: {
    jp: '準備完了！',
    romaji: 'Junbi kanryou!',
    en: "You're ready!",
  },
  tapForTranslation: {
    jp: 'タップで訳を表示',
    romaji: 'Tappu de yaku wo hyouji',
    en: 'Tap for translation',
  },
  storyProgress: {
    jp: 'ストーリー',
    romaji: 'Sutoorii',
    en: 'Story',
  },
  loading: {
    jp: '読み込み中…',
    romaji: 'Yomikomi chuu…',
    en: 'Loading…',
  },
  tapWordHint: {
    jp: '単語をタップして意味を見る',
    romaji: 'Tango wo tappu shite imi wo miru',
    en: 'Tap a word to see its meaning',
  },
  contextPanel: {
    jp: '単語',
    romaji: 'Tango',
    en: 'Word',
  },
  contextPanelEmpty: {
    jp: '単語を選んでください',
    romaji: 'Tango wo erande kudasai',
    en: 'Select a word',
  },
  favorite: { jp: 'お気に入り', romaji: 'Oki ni iri', en: 'Favorite' },
  unfavorite: {
    jp: 'お気に入り解除',
    romaji: 'Oki ni iri kaijo',
    en: 'Remove favorite',
  },
}
