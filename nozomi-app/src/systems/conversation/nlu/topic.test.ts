import { describe, expect, it } from 'vitest'
import { detectTopic } from './topic'

describe('detectTopic scenario intents', () => {
  it('detects train_station from ticket vocabulary', () => {
    expect(detectTopic('Where do I buy a ticket?', [])).toBe('train_station')
  })

  it('detects hotel from check-in phrasing', () => {
    expect(detectTopic('I need to check in please', [])).toBe('hotel')
  })

  it('detects dating from casual date phrasing', () => {
    expect(detectTopic('I had a great date today', [])).toBe('dating')
  })

  it('detects classroom from homework phrasing', () => {
    expect(detectTopic('宿題が多い', [])).toBe('classroom')
  })

  it('keeps active scenario when user gives short reply', () => {
    expect(detectTopic('うん', ['hotel'])).toBe('hotel')
  })
})
