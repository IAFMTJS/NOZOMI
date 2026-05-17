import { describe, expect, it } from 'vitest'
import { resolveSuggestionCount } from './suggestionCount'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '@/types/domain'

describe('resolveSuggestionCount', () => {
  it('returns 0 in focus mode', () => {
    expect(
      resolveSuggestionCount({ ...DEFAULT_SETTINGS, focusMode: true }, DEFAULT_PROFILE),
    ).toBe(0)
  })

  it('caps advanced at 2', () => {
    expect(
      resolveSuggestionCount(
        { ...DEFAULT_SETTINGS, suggestionCount: 5 },
        { ...DEFAULT_PROFILE, immersionLevel: 'advanced' },
      ),
    ).toBe(2)
  })

  it('uses settings count for beginner', () => {
    expect(
      resolveSuggestionCount(
        { ...DEFAULT_SETTINGS, suggestionCount: 4 },
        { ...DEFAULT_PROFILE, immersionLevel: 'beginner' },
      ),
    ).toBe(4)
  })
})
