import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/device', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/device')>()
  return {
    ...actual,
    isWindows: () => true,
    isIos: () => false,
  }
})

import {
  browserSttViableForLang,
  getDefaultSttEngine,
  resolveSttEngineForLang,
} from '@/systems/speech/sttEngine'

describe('browserSttViableForLang', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', {
      userAgent: 'Windows NT 10.0',
      language: 'nl-NL',
    })
    vi.stubGlobal('window', {
      SpeechRecognition: class {},
      webkitSpeechRecognition: undefined,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('blocks Japanese on Dutch Windows UI', () => {
    expect(browserSttViableForLang('ja-JP')).toBe(false)
  })

  it('allows Dutch when UI is Dutch', () => {
    expect(browserSttViableForLang('nl-NL')).toBe(true)
  })

  it('defaults to local on Windows for Japanese learning app', () => {
    expect(getDefaultSttEngine()).toBe('local')
  })

  it('resolveSttEngineForLang falls back to local for Japanese', () => {
    expect(resolveSttEngineForLang('browser', 'ja-JP')).toBe('local')
  })
})
