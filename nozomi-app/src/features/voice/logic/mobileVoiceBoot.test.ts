import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  mobileVoiceBootStorageKey,
  needsMobileVoiceBoot,
  readMobileVoiceBootCache,
  writeMobileVoiceBootCache,
} from '@/features/voice/logic/mobileVoiceBoot'

vi.mock('@/utils/device', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/device')>()
  return {
    ...actual,
    isMobileDevice: vi.fn(() => true),
  }
})

vi.mock('@/features/voice/logic/sttEngine', () => ({
  getSttEngine: () => 'local',
  resolveSttEngineForLang: () => 'local',
}))

vi.mock('@/store/useNozomiStore', () => ({
  useNozomiStore: {
    getState: () => ({
      settings: { speechInputLang: 'ja', whisperModel: 'tiny' },
    }),
  },
}))

describe('mobileVoiceBoot', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('needs boot on mobile with local STT', () => {
    expect(needsMobileVoiceBoot('ja-JP')).toBe(true)
  })

  it('persists boot cache key', () => {
    const key = mobileVoiceBootStorageKey('ja-JP')
    writeMobileVoiceBootCache(key)
    expect(readMobileVoiceBootCache()).toBe(key)
  })
})
