import { describe, expect, it } from 'vitest'
import { pcmRms } from '@/systems/speech/audioDecode'

describe('pcmRms', () => {
  it('returns 0 for empty buffer', () => {
    expect(pcmRms(new Float32Array(0))).toBe(0)
  })

  it('returns 0 for silence', () => {
    expect(pcmRms(new Float32Array(100))).toBe(0)
  })

  it('returns positive level for non-zero samples', () => {
    const s = new Float32Array(100)
    s[50] = 0.5
    expect(pcmRms(s)).toBeGreaterThan(0.04)
  })
})
