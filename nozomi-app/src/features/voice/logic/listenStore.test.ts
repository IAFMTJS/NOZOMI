import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearStaleListenSession } from '@/features/voice/logic/listenLifecycle'
import {
  enqueueSttWork,
  getListenSession,
  setListenSession,
  whenSttWorkIdle,
} from '@/features/voice/logic/listenStore'

describe('clearStaleListenSession', () => {
  it('removes completed sessions but keeps active ones', () => {
    setListenSession({ stopped: false, gotResult: false })
    clearStaleListenSession()
    expect(getListenSession()).not.toBeNull()

    const session = getListenSession()!
    session.stopped = true
    session.gotResult = true
    clearStaleListenSession()
    expect(getListenSession()).toBeNull()
  })
})

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
