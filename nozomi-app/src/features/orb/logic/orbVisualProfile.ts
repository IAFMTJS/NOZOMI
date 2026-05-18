import type { OrbVisualTier } from '@/utils/devicePerformance'
import { getOrbVisualTier } from '@/utils/devicePerformance'

export type OrbCanvasConfig = {
  tier: OrbVisualTier
  particleCount: number
  fpsActive: number
  fpsIdle: number
  blobCount: number
  blobCountReduced: number
  listeningBars: number
  ringCount: number
  lensFlare: boolean
  maxDpr: number
  enableAuroraRing: boolean
}

const PROFILES: Record<OrbVisualTier, OrbCanvasConfig> = {
  full: {
    tier: 'full',
    particleCount: 64,
    fpsActive: 60,
    fpsIdle: 28,
    blobCount: 5,
    blobCountReduced: 3,
    listeningBars: 32,
    ringCount: 4,
    lensFlare: true,
    maxDpr: 2,
    enableAuroraRing: true,
  },
  lite: {
    tier: 'lite',
    particleCount: 34,
    fpsActive: 48,
    fpsIdle: 22,
    blobCount: 4,
    blobCountReduced: 3,
    listeningBars: 24,
    ringCount: 3,
    lensFlare: true,
    maxDpr: 2,
    enableAuroraRing: true,
  },
  static: {
    tier: 'static',
    particleCount: 0,
    fpsActive: 24,
    fpsIdle: 20,
    blobCount: 0,
    blobCountReduced: 0,
    listeningBars: 0,
    ringCount: 0,
    lensFlare: false,
    maxDpr: 1.5,
    enableAuroraRing: false,
  },
}

export function getOrbCanvasConfig(tier: OrbVisualTier = getOrbVisualTier()): OrbCanvasConfig {
  return PROFILES[tier]
}
