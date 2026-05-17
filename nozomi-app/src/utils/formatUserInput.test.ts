import { describe, expect, it } from 'vitest'
import { formatUserMessageText } from './formatUserInput'

describe('formatUserMessageText', () => {
  it('keeps Japanese without duplicating English', () => {
    const t = formatUserMessageText('こんにちは')
    expect(t.jp).toBe('こんにちは')
    expect(t.en).toBe('')
  })

  it('shows English for Latin input', () => {
    const t = formatUserMessageText('hello')
    expect(t.jp).toBe('hello')
    expect(t.en).toBe('hello')
  })
})
