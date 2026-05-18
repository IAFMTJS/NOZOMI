import { useEffect, useRef } from 'react'
import { usePresenceOrbState } from '@/features/orb/hooks/usePresenceOrbState'
import { useOrbAudioLevel } from '@/features/orb/hooks/useOrbAudioLevel'
import {
  applyOrbPaletteToRoot,
  clearOrbPaletteFromRoot,
  getOrbPalette,
  lerpOrbPalette,
} from '@/features/orb/logic/orbPalette'
import { useNozomiStore } from '@/store/useNozomiStore'
import { getVoicePlatformTuning } from '@/utils/device'
import type { OrbState } from '@/types/domain'

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

/** Syncs orb state, palette, and mic level to CSS variables for canvas + chrome. */
export function OrbAmbienceBridge() {
  const level = useOrbAudioLevel()
  const orbState = usePresenceOrbState()
  const intensity = useNozomiStore((s) => s.settings.orbIntensity)
  const transitionRef = useRef<{ from: OrbState; to: OrbState; t: number }>({
    from: orbState,
    to: orbState,
    t: 1,
  })

  useEffect(() => {
    const tr = transitionRef.current
    if (orbState === tr.to && tr.t >= 1) return
    tr.from = tr.t >= 1 ? tr.to : tr.from
    tr.to = orbState
    tr.t = 0
  }, [orbState])

  useEffect(() => {
    let raf = 0
    let lastAt = 0
    const minInterval = 1000 / getVoicePlatformTuning().orbAmbienceFpsCap
    const tick = (now: number) => {
      if (!lastAt || now - lastAt >= minInterval) {
        lastAt = now
        const tr = transitionRef.current
        if (tr.t < 1) tr.t = Math.min(1, tr.t + 0.07)
        const palette = lerpOrbPalette(
          getOrbPalette(tr.from),
          getOrbPalette(tr.to),
          easeOutCubic(tr.t),
        )
        if (tr.t >= 1) tr.from = tr.to
        applyOrbPaletteToRoot(palette, level, intensity, orbState)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      clearOrbPaletteFromRoot()
    }
  }, [level, intensity, orbState])

  return null
}

/** @deprecated Use OrbAmbienceBridge */
export const OrbAudioLevelBridge = OrbAmbienceBridge
