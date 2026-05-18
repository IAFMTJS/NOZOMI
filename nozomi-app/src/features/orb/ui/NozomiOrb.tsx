import { motion, useReducedMotion } from 'framer-motion'
import { usePresenceOrbState } from '@/features/orb/hooks/usePresenceOrbState'
import { OrbCanvas } from '@/features/orb/ui/OrbCanvas'
import { StaticOrbVisual } from '@/features/orb/ui/StaticOrbVisual'
import { useNozomiStore } from '@/store/useNozomiStore'
import { getOrbCanvasConfig } from '@/features/orb/logic/orbVisualProfile'
import { isIosVoiceHeavyUi } from '@/features/voice/logic/iosMemoryBudget'
import { useUiStore } from '@/store/useUiStore'
import { getOrbVisualTier } from '@/utils/device'

interface Props {
  size?: number
  className?: string
  showPlatform?: boolean
}

export function NozomiOrb({ size = 220, className = '', showPlatform = false }: Props) {
  const orbState = usePresenceOrbState()
  const reducedMotionPref = useReducedMotion()
  const reducedMotion = useNozomiStore((s) => s.settings.reducedMotion)
  const staticOrb = useNozomiStore((s) => s.settings.staticOrb)
  const intensity = useNozomiStore((s) => s.settings.orbIntensity)
  const speechState = useUiStore((s) => s.speechState)
  const visualTier = getOrbVisualTier()
  const canvasConfig = getOrbCanvasConfig(visualTier)
  const iosVoiceHeavy = isIosVoiceHeavyUi(orbState, speechState)
  const forceStatic = staticOrb || visualTier === 'static' || iosVoiceHeavy
  const reduced =
    reducedMotion || forceStatic || !!reducedMotionPref || visualTier === 'lite'
  const canvasSize = Math.floor(size * 1.12)
  const showCanvas =
    !forceStatic && !reducedMotion && !reducedMotionPref && !iosVoiceHeavy
  const ringFast = orbState === 'listening' || orbState === 'thinking'
  const motionEnabled = showCanvas && !reducedMotion && !reducedMotionPref

  return (
    <motion.div
      className={`orb-holo relative flex items-center justify-center ${className}`}
      data-orb-state={orbState}
      data-orb-tier={visualTier}
      style={{ width: size, height: size * 0.95 }}
      aria-hidden
      animate={
        !motionEnabled
          ? undefined
          : {
              scale:
                orbState === 'listening'
                  ? [1, 1.025, 1]
                  : orbState === 'speaking'
                    ? [1, 1.02, 1]
                    : [1, 1.015, 1],
            }
      }
      transition={{
        duration:
          orbState === 'listening' ? 1.8 : orbState === 'thinking' ? 2.4 : 4.2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {showCanvas && canvasConfig.enableAuroraRing && (
        <>
          <motion.div className="orb-aura" style={{ width: size * 1.15, height: size * 1.15 }} />
          <motion.div
            className={`orb-holo-ring absolute inset-0 rounded-full${
              ringFast ? ' orb-holo-ring--fast' : ''
            }`}
            style={{ width: size, height: size, margin: 'auto' }}
            animate={{ rotate: 360 }}
            transition={{
              duration: ringFast ? 14 : 22,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </>
      )}

      {showCanvas ? (
        <OrbCanvas
          size={canvasSize}
          state={orbState}
          intensity={intensity}
          config={canvasConfig}
        />
      ) : (
        <>
          {!reduced && (
            <motion.div
              className="orb-pulse-field absolute rounded-full"
              style={{ width: size * 0.94, height: size * 0.94 }}
              animate={{ opacity: [0.45, 0.7, 0.45] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <StaticOrbVisual
            size={size}
            state={orbState}
            pulse={!reduced && orbState === 'listening'}
          />
        </>
      )}

      {showCanvas && canvasConfig.lensFlare && (
        <motion.div
          className="orb-lens-flare pointer-events-none absolute rounded-full"
          style={{ width: size * 0.28, height: size * 0.09, top: '16%', left: '20%' }}
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {showPlatform && (
        <motion.div className="orb-platform-stack absolute bottom-0 left-1/2 w-full -translate-x-1/2">
          <motion.div
            className="orb-platform-glow"
            style={{ width: size * 0.96 }}
            animate={
              reduced
                ? undefined
                : {
                    opacity:
                      orbState === 'speaking'
                        ? [0.55, 1, 0.55]
                        : [0.45, 0.88, 0.45],
                  }
            }
            transition={{
              duration: orbState === 'speaking' ? 1.1 : 2.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.div className="orb-platform-ring" style={{ width: size }} />
          <motion.div className="orb-platform" style={{ width: size * 0.9 }} />
        </motion.div>
      )}
    </motion.div>
  )
}
