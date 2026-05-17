import type { AppSettings, UserProfile } from '@/types/domain'
import { DEFAULT_SETTINGS } from '@/types/domain'

/** How many contextual suggestions the engine should generate. */
export function resolveSuggestionCount(
  settings: AppSettings = DEFAULT_SETTINGS,
  profile: UserProfile,
): number {
  if (settings.focusMode) return 0
  if (profile.immersionLevel === 'advanced') {
    return Math.min(settings.suggestionCount, 2)
  }
  return settings.suggestionCount
}
