import { describe, expect, it, vi } from 'vitest'
import { createSilenceEndpointing } from '@/features/voice/logic/silenceEndpointing'

describe('createSilenceEndpointing', () => {
  it('fires after speech then silence', () => {
    vi.useFakeTimers()
    const onEndpoint = vi.fn()
    let level = 0
    const ep = createSilenceEndpointing({
      getLevel: () => level,
      isActive: () => true,
      onEndpoint,
      config: { minSpeechMs: 100, silenceMs: 200, maxTurnMs: 10_000 },
    })
    ep.start()

    const advance = (ms: number) => {
      vi.advanceTimersByTime(ms)
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(16)
      }
    }

    level = 0.5
    advance(150)
    level = 0
    advance(250)
    expect(onEndpoint).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
