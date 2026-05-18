import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getWarmedRecorderMime,
  resetMicRecorderWarmupForTests,
  warmMicRecorderCodecs,
} from '@/features/voice/logic/micRecorderWarmup'

describe('micRecorderWarmup', () => {
  afterEach(() => {
    resetMicRecorderWarmupForTests()
    vi.unstubAllGlobals()
  })

  it('picks a supported MIME and caches it', () => {
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: (mime: string) => mime.includes('webm'),
    })
    expect(warmMicRecorderCodecs()).toBe('audio/webm;codecs=opus')
    expect(getWarmedRecorderMime()).toBe('audio/webm;codecs=opus')
    expect(warmMicRecorderCodecs()).toBe('audio/webm;codecs=opus')
  })

  it('returns empty when MediaRecorder is missing', () => {
    vi.stubGlobal('MediaRecorder', undefined)
    expect(warmMicRecorderCodecs()).toBe('')
    expect(getWarmedRecorderMime()).toBe('')
  })
})
