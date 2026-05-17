import { describe, expect, it } from 'vitest'
import { chunkJapaneseForTts } from '@/features/voice/logic/ttsChunking'

describe('chunkJapaneseForTts', () => {
  it('returns single chunk for short text', () => {
    expect(chunkJapaneseForTts('こんにちは。')).toEqual(['こんにちは。'])
  })

  it('splits on sentence boundaries', () => {
    const long = 'あ'.repeat(40) + '。' + 'い'.repeat(40) + '。'
    const chunks = chunkJapaneseForTts(long)
    expect(chunks.length).toBeGreaterThan(1)
  })
})
