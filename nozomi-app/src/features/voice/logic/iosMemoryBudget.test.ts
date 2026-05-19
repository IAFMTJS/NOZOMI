import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  effectiveWhisperTierForPlatform,
  isIosVoiceHeavyUi,
} from '@/features/voice/logic/iosMemoryBudget'
import { useUiStore } from '@/store/useUiStore'

vi.mock('@/utils/device', () => ({
  isIos: vi.fn(() => false),
}))

import { isIos } from '@/utils/device'

describe('iosMemoryBudget', () => {
  afterEach(() => {
    vi.mocked(isIos).mockReturnValue(false)
    useUiStore.getState().setVoicePipelineStep('idle')
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
    useUiStore.getState().setVoicePipelineStep('transcribing')
    expect(isIosVoiceHeavyUi('listening', 'listening')).toBe(true)
    useUiStore.getState().setVoicePipelineStep('idle')
  })
})
