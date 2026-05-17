import { getPersonalityLines } from '@/database/importService'
import { hasTrilingualFields } from '@/utils/languageCompleteness'
import type { LanguageText, PersonalityMode } from '@/types/domain'

export type PersonalityContext =
  | 'greeting'
  | 'encouragement'
  | 'general'
  | 'help'
  | 'farewell'
  | 'scenario'

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
  const lines = await getPersonalityLines(mode, context, 8)
  const pool = lines.filter(hasTrilingualFields)
  if (!pool.length) return null
  const line = pool[Math.floor(Math.random() * pool.length)]
  return { jp: line.jp, romaji: line.romaji, en: line.en }
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
    return (
      line ?? {
        jp: 'こんにちは！',
        romaji: 'Konnichiwa!',
        en: 'Hello!',
      }
    )
  }

  if (Math.random() > blendChance) return base

  const line = await pickPersonalityLine(mode, context)
  if (!line || !hasTrilingualFields(line) || !hasTrilingualFields(base)) return base

  return {
    jp: `${line.jp} ${base.jp}`,
    romaji: `${line.romaji} ${base.romaji}`,
    en: `${line.en} ${base.en}`,
  }
}
