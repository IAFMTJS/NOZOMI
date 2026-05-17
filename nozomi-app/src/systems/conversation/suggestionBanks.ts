import type { ScenarioCategory } from '@/types/domain'

/** What kind of user reply Nozomi's last line is inviting. */
export type SuggestionInvite =
  | 'explain_why'
  | 'explain_what'
  | 'explain_more'
  | 'respond_feeling'
  | 'respond_yesno'
  | 'greeting'
  | 'general'

export type Suggestion = {
  jp: string
  romaji: string
  en: string
  id?: string
}

export type ReplyBank = {
  invite: SuggestionInvite
  /** Boost when recent user text matches */
  userContext?: RegExp
  /** Boost when active conversation topic / scenario matches */
  topic?: ScenarioCategory | RegExp
  replies: Suggestion[]
}

const s = (
  jp: string,
  romaji: string,
  en: string,
): Suggestion => ({ jp, romaji, en })

/** Curated tap-to-reply lines — expand here for smarter pills. */
export const SUGGESTION_BANKS: ReplyBank[] = [
  // ─── Bad / tough day → Nozomi asks why ───
  {
    invite: 'explain_why',
    userContext: /(bad|tough|hard|sad|tired|awful|rough|stress|worried|疲|つら|しんど|大変|嫌|最悪|むり|つかれ|だめ)/i,
    replies: [
      s('学校が大変だった', 'Gakkou ga taihen datta', 'School was tough'),
      s('友達とけんかした', 'Tomodachi to kenka shita', 'I had a fight with a friend'),
      s('仕事が忙しかった', 'Shigoto ga isogashikatta', 'Work was really busy'),
      s('あまり寝られなかった', 'Amari nerarenakatta', "I couldn't sleep much"),
      s('テストが近い', 'Tesuto ga chikai', 'I have a test coming up'),
      s('天気が悪かった', 'Tenki ga warukatta', 'The weather was awful'),
      s('人が多くて疲れた', 'Hito ga ookute tsukareta', 'Too many people, I got tired'),
      s('家で喧嘩した', 'Ie de kenka shita', 'I argued at home'),
      s('道に迷った', 'Michi ni mayoitta', 'I got lost'),
    ],
  },
  // ─── Happy / good day follow-up ───
  {
    invite: 'explain_why',
    userContext: /(good|great|fun|happy|nice|楽|嬉|よかった|最高|たのしい)/i,
    replies: [
      s('友達に会えた', 'Tomodachi ni aeta', 'I met a friend'),
      s('美味しいもの食べた', 'Oishii mono tabeta', 'I ate something delicious'),
      s('天気がよかった', 'Tenki ga yokatta', 'The weather was nice'),
      s('ゆっくり休めた', 'Yukkuri yasumeta', 'I got to rest'),
      s('ゲームが面白かった', 'Geemu ga omoshirokatta', 'The game was fun'),
    ],
  },
  // ─── General why / reason ───
  {
    invite: 'explain_why',
    replies: [
      s('時間がなかった', 'Jikan ga nakatta', "I didn't have time"),
      s('電車が遅れた', 'Densha ga okureta', 'The train was late'),
      s('体調が悪い', 'Taichou ga warui', "I'm not feeling well"),
      s('忘れていた', 'Wasurete ita', 'I forgot'),
      s('予定があった', 'Yotei ga atta', 'I had plans'),
      s('お金がなかった', 'Okane ga nakatta', "I didn't have money"),
    ],
  },
  // ─── What happened ───
  {
    invite: 'explain_what',
    replies: [
      s('授業で発表した', 'Jugyou de happyou shita', 'I gave a presentation in class'),
      s('新しいゲームを買った', 'Atarashii geemu wo katta', 'I bought a new game'),
      s('カフェに行った', 'Kafe ni itta', 'I went to a café'),
      s('家族と話した', 'Kazoku to hanashita', 'I talked with my family'),
      s('映画を見た', 'Eiga wo mita', 'I watched a movie'),
      s('散歩した', 'Sanpo shita', 'I went for a walk'),
      s('料理をした', 'Ryouri wo shita', 'I cooked'),
      s('買い物に行った', 'Kaimono ni itta', 'I went shopping'),
    ],
  },
  // ─── Tell me more ───
  {
    invite: 'explain_more',
    replies: [
      s('実はね…', 'Jitsu wa ne…', 'Actually…'),
      s('もう少し話すと…', 'Mou sukoshi hanasu to…', 'If I say a bit more…'),
      s('そういえば', 'Sou ieba', 'Come to think of it'),
      s('長い話になるけど', 'Nagai hanashi ni naru kedo', "It's a long story, but"),
      s('昨日のことなんだけど', 'Kinou no koto nan dakedo', "It's about yesterday"),
    ],
  },
  // ─── Empathy / acknowledgment ───
  {
    invite: 'respond_feeling',
    replies: [
      s('うん、そうだね', 'Un, sou da ne', 'Yeah, I guess so'),
      s('ちょっと疲れた', 'Chotto tsukareta', "I'm a little tired"),
      s('でも大丈夫', 'Demo daijoubu', "But I'm okay"),
      s('ありがとう', 'Arigatou', 'Thank you'),
      s('うれしい', 'Ureshii', "I'm happy"),
      s('まだまだ', 'Mada mada', 'Not yet / still working on it'),
      s('そう思う', 'Sou omou', 'I think so too'),
    ],
  },
  // ─── Yes / no ───
  {
    invite: 'respond_yesno',
    replies: [
      s('うん', 'Un', 'Yeah'),
      s('いいえ', 'Iie', 'No'),
      s('まあね', 'Maa ne', 'Sort of'),
      s('たぶん', 'Tabun', 'Maybe'),
      s('ちょっと', 'Chotto', 'A little'),
    ],
  },
  // ─── Greetings ───
  {
    invite: 'greeting',
    replies: [
      s('元気だよ', 'Genki da yo', "I'm doing well"),
      s('まあまあ', 'Maamaa', 'So-so'),
      s('今日は忙しかった', 'Kyou wa isogashikatta', 'Today was busy'),
      s('ちょっと疲れた', 'Chotto tsukareta', "I'm a little tired"),
      s('いい感じ', 'Ii kanji', 'Pretty good'),
    ],
  },
  // ─── General fallback ───
  {
    invite: 'general',
    replies: [
      s('そうだね', 'Sou da ne', "That's right"),
      s('うん、わかる', 'Un, wakaru', 'Yeah, I get it'),
      s('ちょっと難しい', 'Chotto muzukashii', "It's a bit difficult"),
      s('もう一度言って', 'Mou ichido itte', 'Say that again'),
      s('今日は忙しかった', 'Kyou wa isogashikatta', 'Today was busy'),
      s('特にない', 'Tokuni nai', 'Nothing special'),
    ],
  },

  // ═══ Scenario: train_station ═══
  {
    invite: 'explain_why',
    topic: 'train_station',
    replies: [
      s('切符を買い忘れた', 'Kippu wo kai wasureta', 'I forgot to buy a ticket'),
      s('乗り換えを間違えた', 'Norikae wo machigaeta', 'I took the wrong transfer'),
      s('電車が遅れた', 'Densha ga okureta', 'The train was late'),
      s('ホームがわからない', 'Hoomu ga wakaranai', "I don't know the platform"),
    ],
  },
  {
    invite: 'respond_yesno',
    topic: 'train_station',
    replies: [
      s('新宿行きでいい', 'Shinjuku yuki de ii', 'Shinjuku-bound is fine'),
      s('指定席がいい', 'Shiteiseki ga ii', 'I prefer reserved seats'),
      s('切符を二枚お願い', 'Kippu wo nimai onegai', 'Two tickets, please'),
    ],
  },
  {
    invite: 'general',
    topic: 'train_station',
    replies: [
      s('この電車でいい？', 'Kono densha de ii?', 'Is this the right train?'),
      s('どこで降る？', 'Doko de oriru?', 'Where do I get off?'),
      s('乗り換えはどこ？', 'Norikae wa doko?', 'Where do I transfer?'),
    ],
  },

  // ═══ Scenario: hotel ═══
  {
    invite: 'explain_why',
    topic: 'hotel',
    replies: [
      s('チェックインが遅れた', 'Chekkuin ga okureta', 'Check-in was late'),
      s('部屋が暑かった', 'Heya ga atsukatta', 'The room was hot'),
      s('Wi-Fiがつながらない', 'Waifai ga tsunagaranai', "Wi-Fi won't connect"),
      s('荷物が多い', 'Nimotsu ga ooi', 'I have a lot of luggage'),
    ],
  },
  {
    invite: 'respond_yesno',
    topic: 'hotel',
    replies: [
      s('禁煙でお願い', 'Kinen de onegai', 'Non-smoking, please'),
      s('朝食付きで', 'Choushoku tsuki de', 'With breakfast'),
      s('荷物を預けたい', 'Nimotsu wo azuketai', 'I want to leave my bags'),
    ],
  },
  {
    invite: 'general',
    topic: 'hotel',
    replies: [
      s('チェックインお願い', 'Chekkuin onegai', 'Check-in, please'),
      s('部屋の鍵をなくした', 'Heya no kagi wo nakushita', 'I lost my room key'),
      s('朝食は何時？', 'Choushoku wa nanji?', 'What time is breakfast?'),
    ],
  },

  // ═══ Scenario: dating ═══
  {
    invite: 'explain_why',
    topic: 'dating',
    userContext: /(nervous|shy|緊張|ドキドキ)/i,
    replies: [
      s('緊張した', 'Kincho shita', 'I was nervous'),
      s('話題がなかった', 'Wadai ga nakatta', 'I ran out of things to say'),
      s('早く帰った', 'Hayaku kaetta', 'I went home early'),
    ],
  },
  {
    invite: 'respond_feeling',
    topic: 'dating',
    replies: [
      s('楽しかった', 'Tanoshikatta', 'It was fun'),
      s('また会いたい', 'Mata aitai', 'I want to see you again'),
      s('嬉しかった', 'Ureshikatta', 'I was happy'),
      s('ちょっと緊張した', 'Chotto kincho shita', 'I was a little nervous'),
    ],
  },
  {
    invite: 'general',
    topic: 'dating',
    replies: [
      s('カフェに行きたい', 'Kafe ni ikitai', 'I want to go to a café'),
      s('映画が見たい', 'Eiga ga mitai', 'I want to see a movie'),
      s('今日は楽しかった', 'Kyou wa tanoshikatta', 'Today was fun'),
    ],
  },

  // ═══ Scenario: classroom ═══
  {
    invite: 'explain_why',
    topic: 'classroom',
    replies: [
      s('テストが難しかった', 'Tesuto ga muzukashikatta', 'The test was hard'),
      s('先生に怒られた', 'Sensei ni okorareta', 'The teacher got mad at me'),
      s('宿題が多い', 'Shukudai ga ooi', 'I have too much homework'),
      s('発表が下手だった', 'Happyou ga heta datta', 'My presentation went poorly'),
    ],
  },
  {
    invite: 'explain_what',
    topic: 'classroom',
    replies: [
      s('数学の授業だった', 'Suugaku no jugyou datta', 'It was math class'),
      s('グループワークした', 'Guruupu waaku shita', 'We did group work'),
      s('小テストがあった', 'Sho tesuto ga atta', 'There was a quiz'),
    ],
  },
  {
    invite: 'general',
    topic: 'classroom',
    replies: [
      s('宿題終わってない', 'Shukudai owattenai', "I haven't finished homework"),
      s('勉強しなきゃ', 'Benkyou shinakya', 'I have to study'),
      s('授業おもしろかった', 'Jugyou omoshirokatta', 'Class was interesting'),
    ],
  },
]
