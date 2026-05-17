import { describe, expect, it } from 'vitest'
import { isJapaneseToken, tokenizeJapanese } from './japaneseTokens'

describe('japaneseTokens', () => {
  it('splits mixed punctuation', () => {
    expect(tokenizeJapanese('今日はどうだった？')).toEqual([
      '今日はどうだった',
      '？',
    ])
  })

  it('detects japanese segments', () => {
    expect(isJapaneseToken('疲れた')).toBe(true)
    expect(isJapaneseToken('？')).toBe(false)
  })
})
