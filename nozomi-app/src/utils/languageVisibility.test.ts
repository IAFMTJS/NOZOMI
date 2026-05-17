import { describe, expect, it } from 'vitest'
import { getLanguageVisibility, normalizeLanguageText } from './languageVisibility'
import { DEFAULT_SETTINGS } from '@/types/domain'

describe('languageVisibility', () => {
  it('shows all layers for beginner', () => {
    const v = getLanguageVisibility('beginner', DEFAULT_SETTINGS)
    expect(v.showJapanese).toBe(true)
    expect(v.showRomaji).toBe(true)
    expect(v.showEnglish).toBe(true)
    expect(v.revealSupport).toBe(false)
  })

  it('subtles english for intermediate with settings on', () => {
    const v = getLanguageVisibility('intermediate', DEFAULT_SETTINGS)
    expect(v.englishSubtle).toBe(true)
    expect(v.showEnglish).toBe(true)
  })

  it('reveals english for intermediate when disabled in settings', () => {
    const v = getLanguageVisibility('intermediate', {
      ...DEFAULT_SETTINGS,
      showEnglish: false,
    })
    expect(v.revealEnglish).toBe(true)
    expect(v.showEnglish).toBe(false)
  })

  it('bundles support layers for advanced when settings off', () => {
    const v = getLanguageVisibility('advanced', {
      ...DEFAULT_SETTINGS,
      showEnglish: false,
      showRomaji: false,
    })
    expect(v.revealSupport).toBe(true)
  })

  it('normalizes missing fields', () => {
    const t = normalizeLanguageText({ jp: 'こんにちは' })
    expect(t.jp).toBe('こんにちは')
    expect(t.en).toBe('')
  })
})
