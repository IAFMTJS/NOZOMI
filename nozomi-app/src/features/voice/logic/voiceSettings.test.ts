import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/types/domain'
import {
  isContinuousListenMode,
  shouldAutoStopListening,
} from '@/features/voice/logic/voiceSettings'

describe('voiceSettings', () => {
  it('auto stop when listenEndMode is auto', () => {
    expect(
      shouldAutoStopListening({ ...DEFAULT_SETTINGS, listenEndMode: 'auto' }),
    ).toBe(true)
  })

  it('push_to_talk with tap end mode does not auto stop', () => {
    expect(
      shouldAutoStopListening({
        ...DEFAULT_SETTINGS,
        voiceListenMode: 'push_to_talk',
        listenEndMode: 'tap',
      }),
    ).toBe(false)
  })

  it('continuous mode flag', () => {
    expect(
      isContinuousListenMode({
        ...DEFAULT_SETTINGS,
        voiceListenMode: 'continuous',
      }),
    ).toBe(true)
  })
})
