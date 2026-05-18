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
  | 'chooseJlpt'
  | 'chooseTone'
  | 'displayName'
  | 'statusPreparing'
  | 'statusRecordingLocal'
  | 'statusFinalizing'
  | 'statusSpeaking'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'startChat'
  | 'micDenied'
  | 'micDeniedEn'
  | 'micBusy'
  | 'micNoDevice'
  | 'micModelFailed'
  | 'micStartFailed'
  | 'micNetwork'
  | 'voiceTranscribeFailed'
  | 'micNeedsHttps'
  | 'micRetry'
  | 'noSpeech'
  | 'heardYou'
  | 'processingSpeech'
  | 'saySomething'
  | 'tapOrbToSpeak'
  | 'tapOrbToStop'
  | 'speakToInterrupt'
  | 'voiceListenMode'
  | 'voiceListenPush'
  | 'voiceListenAutoStop'
  | 'voiceListenContinuous'
  | 'listenEndMode'
  | 'listenEndTap'
  | 'listenEndAuto'
  | 'listenEndAutoWithTap'
  | 'ttsProvider'
  | 'ttsBrowser'
  | 'ttsCloud'
  | 'whisperModel'
  | 'whisperTiny'
  | 'whisperSmall'
  | 'labsSection'
  | 'labsWakeWord'
  | 'labsCloudLlm'
  | 'labsRealtimeS2s'
  | 'labsTelephony'
  | 'cloudApiKey'
  | 'motionReduce'
  | 'focusMode'
  | 'showRomaji'
  | 'showEnglish'
  | 'voiceSpeed'
  | 'voicePitch'
  | 'nozomiVoice'
  | 'voiceAuto'
  | 'voicePreview'
  | 'voiceLoading'
  | 'voiceAutoHint'
  | 'voiceQualityHint'
  | 'voiceEnabled'
  | 'suggestionVoiceEnabled'
  | 'speechInputLang'
  | 'speechLangAuto'
  | 'speechLangJa'
  | 'speechLangEn'
  | 'speechLangNl'
  | 'sttEngine'
  | 'sttEngineLocal'
  | 'sttEngineBrowser'
  | 'sttEngineIosNote'
  | 'sttEngineWindowsNote'
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
  | 'storyMode'
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
  | 'chatNav'
  | 'favorites'
  | 'favoritesEmpty'
  | 'wordsLoadError'
  | 'restartOnboarding'
  | 'chooseStory'
  | 'tabScenarios'
  | 'tabStories'

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
  chooseJlpt: {
    jp: '日本語のレベル',
    romaji: 'Nihongo no reberu',
    en: 'Your Japanese level',
  },
  displayName: {
    jp: '名前（任意）',
    romaji: 'Namae (ninii)',
    en: 'Name (optional)',
  },
  statusPreparing: {
    jp: '準備中…',
    romaji: 'Junbi chuu…',
    en: 'Preparing…',
  },
  statusRecordingLocal: {
    jp: '録音中…（話し終わったら文字起こし）',
    romaji: 'Rokuon chuu… (hanashi owattara mojiokoshi)',
    en: 'Recording… transcript when you stop',
  },
  statusFinalizing: {
    jp: '文字起こし中…',
    romaji: 'Mojiokoshi chuu…',
    en: 'Transcribing…',
  },
  statusSpeaking: {
    jp: '話しています…',
    romaji: 'Hanashite imasu…',
    en: 'Speaking…',
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
  micBusy: {
    jp: 'マイクが他のアプリで使われているか、直前に解放されました。ほかのアプリを閉じて、もう一度試してください。',
    romaji: 'Maiku ga hoka no apuri de tsukawarete iru ka, chokkuzen ni kaihou saremashita.',
    en: 'The mic may be in use by another app, or still releasing. Close other apps using the mic and try again.',
  },
  micNoDevice: {
    jp: '入力デバイスが見つかりません。マイクを接続するか、設定で入力デバイスを選び直してください。',
    romaji: 'Nyuuryoku debaisu ga mitsukarimasen.',
    en: 'No input device found. Plug in a microphone or pick an input device in system settings.',
  },
  micModelFailed: {
    jp: '音声モデルの読み込みに失敗しました。インターネット接続を確認するか、設定で「ブラウザ標準」の音声認識に切り替えてください。',
    romaji: 'Onsei moderu no yomikomi ni shippai shimashita.',
    en: 'Could not load the speech model. Check your internet connection, or switch to Browser speech in Settings.',
  },
  micStartFailed: {
    jp: '音声認識を開始できませんでした。もう一度試すか、設定で音声認識エンジンを切り替えてください。',
    romaji: 'Onsei ninshiki wo kaishi dekimasen deshita.',
    en: 'Could not start speech recognition. Try again or switch the speech engine in Settings.',
  },
  micNetwork: {
    jp: '音声認識にはインターネット接続が必要です（ChromeまたはEdge）。',
    romaji: 'Onsei ninshiki ni wa intaanetto setsuzoku ga hitsuyou desu.',
    en: 'Speech recognition needs internet (use Chrome or Edge on desktop).',
  },
  voiceTranscribeFailed: {
    jp: '音声をうまく処理できませんでした。もう一度話すか、設定で音声認識を切り替えてみてください。',
    romaji: 'Onsei wo umaku shori dekimasen deshita.',
    en: "Couldn't process that audio. Try again or switch speech recognition in Settings.",
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
  speakToInterrupt: {
    jp: '話しかけると中断できます',
    romaji: 'Hanashikakeru to chuudan dekimasu',
    en: 'Speak to interrupt',
  },
  voiceListenMode: {
    jp: '聞き取りモード',
    romaji: 'Kikitori moodo',
    en: 'Listen mode',
  },
  voiceListenPush: {
    jp: 'プッシュトーク',
    romaji: 'Pusshu tooku',
    en: 'Push to talk',
  },
  voiceListenAutoStop: {
    jp: '自動停止',
    romaji: 'Jidou teishi',
    en: 'Auto stop',
  },
  voiceListenContinuous: {
    jp: '連続会話',
    romaji: 'Renzoku kaiwa',
    en: 'Continuous',
  },
  listenEndMode: {
    jp: '発話の終わり',
    romaji: 'Hatsuwa no owari',
    en: 'End of speech',
  },
  listenEndTap: {
    jp: 'タップのみ',
    romaji: 'Tappu nomi',
    en: 'Tap only',
  },
  listenEndAuto: {
    jp: '無音で自動',
    romaji: 'Seion de jidou',
    en: 'Auto on silence',
  },
  listenEndAutoWithTap: {
    jp: '自動＋タップ',
    romaji: 'Jidou + tappu',
    en: 'Auto + tap',
  },
  ttsProvider: {
    jp: '音声合成',
    romaji: 'Onsei gousei',
    en: 'Speech output',
  },
  ttsBrowser: {
    jp: 'ブラウザ',
    romaji: 'Burauza',
    en: 'Browser',
  },
  ttsCloud: {
    jp: 'クラウド（要キー）',
    romaji: 'Kuraudo',
    en: 'Cloud (API key)',
  },
  whisperModel: {
    jp: 'Whisperモデル',
    romaji: 'Whisper moderu',
    en: 'Whisper model',
  },
  whisperTiny: {
    jp: 'Tiny（速い）',
    romaji: 'Tiny',
    en: 'Tiny (fast)',
  },
  whisperSmall: {
    jp: 'Small（精度）',
    romaji: 'Small',
    en: 'Small (accurate)',
  },
  labsSection: {
    jp: '実験機能',
    romaji: 'Jikken kinou',
    en: 'Labs',
  },
  labsWakeWord: {
    jp: 'ウェイクワード',
    romaji: 'Weiku waado',
    en: 'Wake word',
  },
  labsCloudLlm: {
    jp: 'クラウド会話',
    romaji: 'Kuraudo kaiwa',
    en: 'Cloud chat',
  },
  labsRealtimeS2s: {
    jp: 'リアルタイム音声',
    romaji: 'Riarutaimu onsei',
    en: 'Realtime speech',
  },
  labsTelephony: {
    jp: '電話ブリッジ',
    romaji: 'Denwa burijji',
    en: 'Phone bridge',
  },
  cloudApiKey: {
    jp: 'APIキー',
    romaji: 'API kii',
    en: 'API key',
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
  nozomiVoice: {
    jp: 'ノゾミの声',
    romaji: 'Nozomi no koe',
    en: 'Nozomi voice',
  },
  voiceAuto: {
    jp: '自動（おすすめ）',
    romaji: 'Jidou (osusume)',
    en: 'Auto (recommended)',
  },
  voicePreview: {
    jp: '試聴',
    romaji: 'Shichou',
    en: 'Preview',
  },
  voiceLoading: {
    jp: '音声一覧を読み込み中…',
    romaji: 'Onsei ichiran wo yomikomi chuu…',
    en: 'Loading available voices…',
  },
  voiceAutoHint: {
    jp: '現在: {name}',
    romaji: 'Genzai: {name}',
    en: 'Using: {name}',
  },
  voiceQualityHint: {
    jp: 'iPhoneでは「設定 → 読み上げ → 声 → 日本語」で Kyoko（高品質）をダウンロードすると、より自然な声になります。',
    romaji: 'iPhone de wa Kyoko (kouhinshitsu) wo daunroodo suru to yori shizen na koe ni narimasu.',
    en: 'On iPhone: Settings → Accessibility → Spoken Content → Voices → Japanese → download Kyoko (Enhanced) for the most natural voice.',
  },
  voiceEnabled: {
    jp: '声を再生',
    romaji: 'Koe wo saisei',
    en: 'Play Nozomi voice',
  },
  suggestionVoiceEnabled: {
    jp: '提案を読み上げ',
    romaji: 'Teian wo yomiage',
    en: 'Read suggestions aloud',
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
    jp: 'オンデバイス（高精度）',
    romaji: 'Ondebaisu (kouseido)',
    en: 'On-device (accurate)',
  },
  sttEngineBrowser: {
    jp: 'ブラウザ標準（スマホ推奨）',
    romaji: 'Burauza hyoujun (sumaho suishou)',
    en: 'Browser built-in (mobile)',
  },
  sttEngineIosNote: {
    jp: 'iPhoneではオンデバイス音声認識を使用します（初回のみモデル読み込みがあります）。',
    romaji: 'iPhone de wa ondebaisu onsei ninshiki wo shiyou shimasu.',
    en: 'On iPhone, on-device speech recognition is used (first use downloads the model).',
  },
  sttEngineWindowsNote: {
    jp: 'Windowsの表示言語と違う言語ではブラウザ音声認識が使えません。オンデバイス（日本語）を使用します。',
    romaji: 'Windows no hyouji gengo to chigau gengo de wa burauza onsei ninshiki ga tsukaemasen.',
    en: 'On Windows, browser speech recognition only works when it matches your PC display language. Japanese uses on-device recognition instead.',
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
  storyMode: {
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
  chatNav: { jp: 'チャット', romaji: 'Chatto', en: 'Chat' },
  favorites: { jp: 'お気に入り', romaji: 'Oki ni iri', en: 'Favorites' },
  favoritesEmpty: {
    jp: 'お気に入りの単語はまだありません',
    romaji: 'Oki ni iri no tango wa mada arimasen',
    en: 'No favorite words yet',
  },
  wordsLoadError: {
    jp: '単語を読み込めませんでした',
    romaji: 'Tango wo yomikome masen deshita',
    en: 'Could not load vocabulary',
  },
  restartOnboarding: {
    jp: 'オンボーディングをやり直す',
    romaji: 'Onboodingu wo yarinaosu',
    en: 'Restart onboarding',
  },
  chooseStory: {
    jp: 'ストーリーを選ぶ',
    romaji: 'Sutoorii wo erabu',
    en: 'Choose a story',
  },
  tabScenarios: { jp: 'シナリオ', romaji: 'Shinario', en: 'Scenarios' },
  tabStories: { jp: 'ストーリー', romaji: 'Sutoorii', en: 'Stories' },
}
