import { getPersonalityLines } from '@/database/importService'
import { isGenericGreetingLine } from '@/systems/conversation/engineHelpers'
import { hasTrilingualFields } from '@/utils/languageCompleteness'
import type { LanguageText, PersonalityMode } from '@/types/domain'

const FALLBACK_BY_CONTEXT: Record<PersonalityContext, LanguageText> = {
  greeting: {
    jp: '今日はどうだった？',
    romaji: 'Kyou wa dou datta?',
    en: 'How was your day?',
  },
  encouragement: {
    jp: 'いい感じだね。',
    romaji: 'Ii kanji da ne.',
    en: "You're doing great.",
  },
  general: {
    jp: 'そうだね。',
    romaji: 'Sou da ne.',
    en: 'Yeah, I see.',
  },
  help: {
    jp: 'ゆっくり話してみて。',
    romaji: 'Yukkuri hanashite mite.',
    en: 'Try speaking slowly.',
  },
  farewell: {
    jp: 'また話そうね。',
    romaji: 'Mata hanasou ne.',
    en: "Let's talk again soon.",
  },
  scenario: {
    jp: '始めよう。',
    romaji: 'Hajimeyou.',
    en: "Let's begin.",
  },
  grammar_hint: {
    jp: '文法を一緒に見よう。',
    romaji: 'Bunpou wo issho ni miyou.',
    en: "Let's look at the grammar together.",
  },
  correction: {
    jp: 'もう一度やってみて。',
    romaji: 'Mou ichido yatte mite.',
    en: 'Try once more.',
  },
}

export type PersonalityContext =
  | 'greeting'
  | 'encouragement'
  | 'general'
  | 'help'
  | 'farewell'
  | 'scenario'
  | 'grammar_hint'
  | 'correction'

/** Maps user-facing mode to DB line pools */
export function resolveDbModes(mode: PersonalityMode): string[] {
  const map: Record<PersonalityMode, string[]> = {
    calm: ['calm', 'supportive'],
    supportive: ['supportive', 'calm', 'teacher'],
    playful: ['playful', 'casual_friend'],
    teasing: ['playful', 'casual_friend'],
    philosophical: ['calm', 'teacher'],
    teacher: ['teacher', 'strict_tutor'],
    casual_friend: ['casual_friend', 'playful'],
    strict_tutor: ['strict_tutor', 'teacher'],
  }
  return map[mode] ?? ['calm']
}

export async function pickPersonalityLine(
  mode: PersonalityMode,
  context: PersonalityContext,
): Promise<LanguageText | null> {
  const lines = await getPersonalityLines(mode, context, 12)
  const pool = lines.filter(
    (l) => hasTrilingualFields(l) && !isGenericGreetingLine(l.jp),
  )
  if (!pool.length) return null
  const line = pool[Math.floor(Math.random() * pool.length)]
  return { jp: line!.jp, romaji: line!.romaji, en: line!.en }
}

/** Blend personality opener with optional base sentence */
export async function blendWithPersonality(
  mode: PersonalityMode,
  context: PersonalityContext,
  base: LanguageText | null,
  blendChance = 0.35,
): Promise<LanguageText> {
  if (!base) {
    const line = await pickPersonalityLine(mode, context)
    return line ?? FALLBACK_BY_CONTEXT[context]
  }

  if (Math.random() > blendChance) return base

  const line = await pickPersonalityLine(mode, context)
  if (!line || !hasTrilingualFields(line) || !hasTrilingualFields(base)) return base
  if (line.jp === base.jp || isGenericGreetingLine(line.jp)) return base
  if (isGenericGreetingLine(base.jp) || context === 'greeting') return base

  const combined = `${line.jp} ${base.jp}`
  if (combined.length > 52) return base

  return {
    jp: combined,
    romaji: `${line.romaji} ${base.romaji}`,
    en: `${line.en} ${base.en}`,
  }
}
