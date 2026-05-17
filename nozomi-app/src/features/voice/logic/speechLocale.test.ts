import { describe, expect, it } from 'vitest'
import { resolveSpeechRecognitionLang } from './speechLocale'

describe('resolveSpeechRecognitionLang', () => {
  it('defaults auto to Japanese for the learning app', () => {
    expect(resolveSpeechRecognitionLang('auto')).toBe('ja-JP')
  })

  it('honours explicit English', () => {
    expect(resolveSpeechRecognitionLang('en-US')).toBe('en-US')
  })

  it('honours explicit Japanese', () => {
    expect(resolveSpeechRecognitionLang('ja-JP')).toBe('ja-JP')
  })
})
