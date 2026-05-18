import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  effectiveWhisperTierForPlatform,
  isIosVoiceHeavyUi,
} from '@/features/voice/logic/iosMemoryBudget'

vi.mock('@/utils/device', () => ({
  isIos: vi.fn(() => false),
}))

import { isIos } from '@/utils/device'

describe('iosMemoryBudget', () => {
  afterEach(() => {
    vi.mocked(isIos).mockReturnValue(false)
  })

  it('downgrades whisper-small on iOS', () => {
    vi.mocked(isIos).mockReturnValue(true)
    expect(effectiveWhisperTierForPlatform('small')).toBe('tiny')
  })

  it('marks voice heavy only during processing/thinking on iOS', () => {
    vi.mocked(isIos).mockReturnValue(true)
    expect(isIosVoiceHeavyUi('listening', 'listening')).toBe(false)
    expect(isIosVoiceHeavyUi('thinking', 'idle')).toBe(true)
    expect(isIosVoiceHeavyUi('idle', 'processing')).toBe(true)
  })
})
