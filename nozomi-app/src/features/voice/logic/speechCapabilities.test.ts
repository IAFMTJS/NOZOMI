import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getSharedMicStream,
  primeMicrophonePermission,
  releaseSharedMicrophone,
} from '@/features/voice/logic/speechCapabilities'

describe('primeMicrophonePermission', () => {
  beforeEach(() => {
    releaseSharedMicrophone()
  })

  afterEach(() => {
    releaseSharedMicrophone()
    vi.unstubAllGlobals()
  })

  it('dedupes concurrent prime calls into one getUserMedia', async () => {
    const getUserMedia = vi.fn().mockResolvedValue({
      active: true,
      getAudioTracks: () => [{ stop: vi.fn() }],
      getTracks: () => [{ stop: vi.fn() }],
    })
    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia },
    })

    const [a, b] = await Promise.all([
      primeMicrophonePermission(),
      primeMicrophonePermission(),
    ])

    expect(a).toBe(true)
    expect(b).toBe(true)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(getSharedMicStream()?.active).toBe(true)
  })
})
