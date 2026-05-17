import { describe, expect, it } from 'vitest'
import { VISUAL_SECTIONS } from './visualSections'

describe('VISUAL_SECTIONS', () => {
  it('has unique section ids', () => {
    const ids = VISUAL_SECTIONS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('includes core presence and orb sections', () => {
    const ids = VISUAL_SECTIONS.map((s) => s.id)
    expect(ids).toContain('presence')
    expect(ids).toContain('orb')
    expect(ids).toContain('tokens')
  })
})
