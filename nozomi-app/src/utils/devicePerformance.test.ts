import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getIosDeviceTier,
  getOrbVisualTier,
  getVoicePlatformTuning,
} from '@/utils/devicePerformance'

function mockScreen(min: number, max: number) {
  vi.stubGlobal('screen', { width: min, height: max })
}

function mockIosUa() {
  vi.stubGlobal('navigator', {
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    hardwareConcurrency: 4,
  })
}

describe('devicePerformance', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('classifies iPhone 14 Pro Max as pro tier with lite orb', () => {
    mockIosUa()
    mockScreen(430, 932)
    expect(getIosDeviceTier()).toBe('pro')
    expect(getOrbVisualTier()).toBe('lite')
  })

  it('classifies small legacy iPhone as static orb', () => {
    mockIosUa()
    mockScreen(375, 667)
    expect(getIosDeviceTier()).toBe('legacy')
    expect(getOrbVisualTier()).toBe('static')
  })

  it('tunes pro iOS whisper chunks for better accuracy within RAM', () => {
    mockIosUa()
    mockScreen(430, 932)
    const tuning = getVoicePlatformTuning()
    expect(tuning.whisperChunkSec).toBe(4)
    expect(tuning.maxDecodeSamples16k).toBe(12 * 16_000)
    expect(tuning.orbAmbienceFpsCap).toBe(48)
  })

  it('uses full orb on desktop', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      hardwareConcurrency: 8,
    })
    mockScreen(1920, 1080)
    expect(getOrbVisualTier()).toBe('full')
  })
})
