import { describe, expect, it, beforeAll } from 'vitest'
import { buildLexiconIndex } from '@/systems/lexicon/lexiconIndex'
import { prepareVoiceInput } from './prepareVoiceInput'

beforeAll(() => {
  buildLexiconIndex([
    {
      id: 1,
      jp: '疲れる',
      hiragana: 'つかれる',
      romaji: 'tsukeru',
      en: 'to get tired',
      jlptLevel: 'N5',
      category: 'daily',
    },
    {
      id: 2,
      jp: 'ラーメン',
      hiragana: 'らーめん',
      romaji: 'raamen',
      en: 'ramen',
      jlptLevel: 'N5',
      category: 'food',
    },
  ])
})

describe('prepareVoiceInput', () => {
  it('maps common romaji greetings to Japanese in engine text', () => {
    const { display, engine } = prepareVoiceInput('konnichiwa')
    expect(display).toBe('konnichiwa')
    expect(engine).toContain('こんにちは')
  })

  it('strips leading fillers', () => {
    const { display } = prepareVoiceInput('えーと、今日は疲れた')
    expect(display).toBe('今日は疲れた')
  })

  it('adds lexicon surfaces for romaji tokens', () => {
    const { engine } = prepareVoiceInput('I love raamen')
    expect(engine).toContain('ラーメン')
  })

  it('keeps Japanese display unchanged', () => {
    const { display, engine } = prepareVoiceInput('今日は疲れた')
    expect(display).toBe('今日は疲れた')
    expect(engine).toContain('今日は疲れた')
  })

  it('maps whole-line English STT to Japanese semantics', () => {
    const { engine } = prepareVoiceInput("I'm tired")
    expect(engine).toContain('疲れた')
  })

  it('maps how are you', () => {
    const { engine } = prepareVoiceInput('how are you')
    expect(engine).toContain('元気')
  })
})
