import type { LanguageText } from '@/types/domain'

export const RECOVERY_LINES: LanguageText[] = [
  {
    jp: 'そうですね。もう少し教えてください。',
    romaji: 'Sou desu ne. Mou sukoshi oshiete kudasai.',
    en: 'I see. Tell me a bit more.',
  },
  {
    jp: 'へえ、それについてもっと聞かせて。',
    romaji: 'Hee, sore ni tsuite motto kikasete.',
    en: 'Interesting — tell me more about that.',
  },
  {
    jp: 'なるほど。次はどうする？',
    romaji: 'Naruhodo. Tsugi wa dou suru?',
    en: 'I get it. What next?',
  },
  {
    jp: 'うん、続けて。',
    romaji: 'Un, tsuzukete.',
    en: 'Yeah, go on.',
  },
]

export function pickRecoveryLine(recentJp: string[], input: string): LanguageText {
  const key = recentJp.join('|') + input
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i)) | 0
  return RECOVERY_LINES[Math.abs(hash) % RECOVERY_LINES.length]!
}
