import { afterEach, describe, expect, it, vi } from 'vitest'
import { enqueueSttWork, whenSttWorkIdle } from '@/features/voice/logic/listenStore'

describe('whenSttWorkIdle', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves when the STT queue is idle without timing out', async () => {
    vi.useFakeTimers()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await whenSttWorkIdle(8_000)
    await vi.runAllTimersAsync()

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('waits for in-flight STT work before resolving', async () => {
    let release!: () => void
    const work = new Promise<void>((resolve) => {
      release = resolve
    })
    void enqueueSttWork(() => work)

    const idle = whenSttWorkIdle(8_000)
    await Promise.resolve()
    let settled = false
    void idle.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)

    release()
    await idle
    expect(settled).toBe(true)
  })
})
