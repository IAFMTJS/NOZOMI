import { describe, expect, it } from 'vitest'
import { detectIntent } from './intent'

describe('detectIntent', () => {
  it('detects greeting', () => {
    expect(detectIntent('こんにちは')).toBe('greeting')
    expect(detectIntent('hello')).toBe('greeting')
  })

  it('detects question', () => {
    expect(detectIntent('今日はどう？')).toBe('question')
  })

  it('detects farewell', () => {
    expect(detectIntent('またね')).toBe('farewell')
  })

  it('detects feedback', () => {
    expect(detectIntent('thanks!')).toBe('feedback')
    expect(detectIntent('ありがとう')).toBe('feedback')
  })
})
