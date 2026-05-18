import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectiveWhisperTierForPlatform } from '@/features/voice/logic/offlineSttIos'

vi.mock('@/utils/device', () => ({
  isIos: vi.fn(() => false),
}))

import { isIos } from '@/utils/device'

describe('effectiveWhisperTierForPlatform', () => {
  afterEach(() => {
    vi.mocked(isIos).mockReturnValue(false)
  })

  it('keeps tier on non-iOS', () => {
    expect(effectiveWhisperTierForPlatform('small')).toBe('small')
    expect(effectiveWhisperTierForPlatform('tiny')).toBe('tiny')
  })

  it('downgrades small to tiny on iOS', () => {
    vi.mocked(isIos).mockReturnValue(true)
    expect(effectiveWhisperTierForPlatform('small')).toBe('tiny')
    expect(effectiveWhisperTierForPlatform('tiny')).toBe('tiny')
  })
})
