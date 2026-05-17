import { describe, expect, it } from 'vitest'
import { pickByResponseHints, pickContextualSentence } from './replyMatcher'
import type { Sentence } from '@/types/domain'

const pool: Sentence[] = [
  {
    id: 1,
    jp: 'お疲れさま。',
    romaji: 'Otsukaresama.',
    en: 'Good work today.',
    category: 'daily',
    jlptLevel: 'N5',
  },
  {
    id: 2,
    jp: 'ラーメンが好きですか？',
    romaji: 'Raamen ga suki desu ka?',
    en: 'Do you like ramen?',
    category: 'food',
    jlptLevel: 'N5',
  },
  {
    id: 3,
    jp: '今日は忙しかった。',
    romaji: 'Kyou wa isogashikatta.',
    en: 'Today was busy.',
    category: 'daily',
    jlptLevel: 'N5',
  },
  {
    id: 4,
    jp: '彼は危うく溺死するところだった。',
    romaji: 'kareha ayauku dekishi surutokorodatta',
    en: 'He was almost drowned.',
    category: 'daily',
    jlptLevel: 'N5',
  },
  {
    id: 5,
    jp: '雨が降っています。',
    romaji: 'Ame ga futte imasu.',
    en: 'It is raining.',
    category: 'daily',
    jlptLevel: 'N5',
  },
  {
    id: 1001,
    jp: '切符を二枚ください。',
    romaji: 'Kippu wo nimai kudasai.',
    en: 'Two tickets, please.',
    category: 'train_station',
    jlptLevel: 'N5',
  },
]

describe('pickContextualSentence', () => {
  it('prefers food-related reply when user mentions ramen', () => {
    const picked = pickContextualSentence(
      pool,
      'I love ramen',
      'statement',
      'food',
      [],
      new Set(),
    )
    expect(picked?.jp).toContain('ラーメン')
  })

  it('prefers tired-related reply when user says tired', () => {
    const picked = pickContextualSentence(
      pool,
      "I'm so tired today",
      'statement',
      'daily',
      [],
      new Set(),
    )
    expect(picked?.jp).toBe('お疲れさま。')
  })

  it('prefers busy reply over unrelated long sentence', () => {
    const picked = pickContextualSentence(
      pool,
      'Today was really busy at work',
      'statement',
      'daily',
      [],
      new Set(),
    )
    expect(picked?.jp).toBe('今日は忙しかった。')
  })

  it('uses recent user context when current line is short', () => {
    const picked = pickContextualSentence(
      pool,
      'yeah',
      'feedback',
      'daily',
      [],
      new Set(),
      { recentUserText: '今日は雨だった' },
    )
    expect(picked?.jp).toContain('雨')
  })

  it('avoids third-person narrative when user speaks in first person', () => {
    const picked = pickContextualSentence(
      pool,
      '私は今日疲れた',
      'statement',
      'daily',
      [],
      new Set(),
    )
    expect(picked?.jp).not.toContain('彼は')
  })

  it('prefers Japanese tired input', () => {
    const picked = pickContextualSentence(
      pool,
      '今日は疲れた',
      'statement',
      'daily',
      [],
      new Set(),
    )
    expect(picked?.jp).toBe('お疲れさま。')
  })

  it('pickByResponseHints matches tired input to empathetic reply', () => {
    const picked = pickByResponseHints(pool, "I'm tired today", [])
    expect(picked?.jp).toBe('お疲れさま。')
  })

  it('prefers train_station reply when scenario topic is active', () => {
    const picked = pickContextualSentence(
      pool,
      'I need two tickets',
      'statement',
      'train_station',
      [],
      new Set(),
    )
    expect(picked?.jp).toContain('切符')
  })
})
