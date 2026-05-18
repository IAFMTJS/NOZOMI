import { describe, expect, it } from 'vitest'
import { hasCachedWhisperWeights } from '@/features/voice/logic/offlineSttCache'

describe('offlineSttCache', () => {
  it('returns false when Cache API is unavailable', async () => {
    const original = globalThis.caches
    // @ts-expect-error test stub
    delete globalThis.caches
    await expect(hasCachedWhisperWeights('Xenova/whisper-tiny')).resolves.toBe(false)
    globalThis.caches = original
  })
})
