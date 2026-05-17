import { describe, expect, it } from 'vitest'
import { inferGrammarTagsForJp } from './grammarTagInference'

describe('inferGrammarTagsForJp', () => {
  it('tags polite questions', () => {
    const tags = inferGrammarTagsForJp('ホームはどこですか？')
    expect(tags).toContain('question')
    expect(tags).toContain('desu-masu')
    expect(tags).toContain('particle-wa')
  })

  it('tags te-form requests', () => {
    expect(inferGrammarTagsForJp('切符を二枚ください。')).toContain('polite-request')
  })

  it('returns empty for very long lines', () => {
    expect(inferGrammarTagsForJp('あ'.repeat(80))).toBe('')
  })
})
