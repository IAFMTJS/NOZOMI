import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  effectiveWhisperTierForPlatform,
  iosHasActiveResource,
  iosTrackResource,
  shouldSkipIdleWhisperPreload,
} from '@/features/voice/logic/iosMemoryBudget'

vi.mock('@/utils/device', () => ({
  isIos: vi.fn(() => false),
}))

import { isIos } from '@/utils/device'

describe('iosMemoryBudget', () => {
  afterEach(() => {
    vi.mocked(isIos).mockReturnValue(false)
    iosTrackResource('whisper-model', false)
    iosTrackResource('whisper-infer', false)
  })

  it('skips idle whisper preload only on iOS', () => {
    expect(shouldSkipIdleWhisperPreload()).toBe(false)
    vi.mocked(isIos).mockReturnValue(true)
    expect(shouldSkipIdleWhisperPreload()).toBe(true)
  })

  it('downgrades whisper-small on iOS', () => {
    vi.mocked(isIos).mockReturnValue(true)
    expect(effectiveWhisperTierForPlatform('small')).toBe('tiny')
  })

  it('tracks active resources on iOS', () => {
    vi.mocked(isIos).mockReturnValue(true)
    iosTrackResource('whisper-infer', true)
    expect(iosHasActiveResource('whisper-infer')).toBe(true)
    iosTrackResource('whisper-infer', false)
    expect(iosHasActiveResource('whisper-infer')).toBe(false)
  })
})
