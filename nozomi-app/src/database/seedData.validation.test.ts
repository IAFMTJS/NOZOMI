import { describe, expect, it } from 'vitest'
import { validateSentenceBatch } from '../../scripts/lib/sentenceValidator.mjs'
import { SEED_SENTENCES } from './seedData'

describe('SEED_SENTENCES validation', () => {
  it('has no structural errors and passes companion quality checks', () => {
    const result = validateSentenceBatch(SEED_SENTENCES, {
      source: 'seedData',
      companionQualityOnly: false,
    })
    if (result.errorCount > 0 || result.warningCount > 0) {
      const messages = result.issues.flatMap((i) => [...i.errors, ...i.warnings])
      expect(messages).toEqual([])
    }
    expect(result.errorCount).toBe(0)
    expect(result.warningCount).toBe(0)
  })
})
