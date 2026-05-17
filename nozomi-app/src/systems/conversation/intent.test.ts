import { describe, expect, it } from 'vitest'
import { detectIntent } from './intent'

describe('detectIntent', () => {
  it('detects greeting', () => {
    expect(detectIntent('こんにちは')).toBe('greeting')
    expect(detectIntent('hello')).toBe('greeting')
  })

  it('detects question', () => {
    expect(detectIntent('今日はどう？')).toBe('question')
    expect(detectIntent('ラーメン好きか')).toBe('question')
  })

  it('detects romaji greeting from speech', () => {
    expect(detectIntent('konnichiwa')).toBe('greeting')
  })

  it('detects farewell', () => {
    expect(detectIntent('またね')).toBe('farewell')
  })

  it('detects feedback', () => {
    expect(detectIntent('thanks!')).toBe('feedback')
    expect(detectIntent('ありがとう')).toBe('feedback')
  })

  it('detects help before question patterns', () => {
    expect(detectIntent('what does that mean')).toBe('help')
    expect(detectIntent('wakaranai')).toBe('help')
    expect(detectIntent('どういう意味？')).toBe('help')
  })
})
