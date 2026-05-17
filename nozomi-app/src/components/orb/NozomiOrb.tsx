import { motion } from 'framer-motion'
import { OrbCanvas } from '@/components/orb/OrbCanvas'
import { useNozomiStore } from '@/store/useNozomiStore'

interface Props {
  size?: number
  className?: string
  showPlatform?: boolean
}

export function NozomiOrb({ size = 220, className = '', showPlatform = false }: Props) {
  const orbState = useNozomiStore((s) => s.orbState)
  const audioLevel = useNozomiStore((s) => s.audioLevel)
  const settings = useNozomiStore((s) => s.settings)
  const reduced = settings.reducedMotion || settings.staticOrb
  const intensity = settings.orbIntensity

  const canvasSize = Math.floor(size * 1.15)

  return (
    <motion.div
      className={`orb-holo relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size * 0.95 }}
      aria-hidden
      animate={reduced ? undefined : { scale: [1, 1.02, 1] }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Rotating hologram ring */}
      {!reduced && (
        <motion.div
          className="orb-holo-ring absolute inset-0 rounded-full"
          style={{ width: size, height: size, margin: 'auto' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {/* Pulse field */}
      <div
        className="orb-pulse-field absolute rounded-full"
        style={{
          width: size * 0.92,
          height: size * 0.92,
          opacity: 0.4 + audioLevel * 0.5,
        }}
      />

      {/* Canvas energy core */}
      <OrbCanvas
        size={canvasSize}
        state={orbState}
        audioLevel={audioLevel}
        intensity={intensity}
        reduced={reduced}
      />

      {/* Lens flare */}
      <motion.div
        className="orb-lens-flare pointer-events-none absolute rounded-full"
        style={{ width: size * 0.25, height: size * 0.08, top: '18%', left: '22%' }}
        animate={reduced ? undefined : { opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      />

      {showPlatform && (
        <div className="orb-platform-stack absolute bottom-0 left-1/2 w-full -translate-x-1/2">
          <motion.div
            className="orb-platform-glow"
            style={{ width: size * 0.95 }}
            animate={reduced ? undefined : { opacity: [0.5, 0.85, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          <div className="orb-platform-ring" style={{ width: size * 0.98 }} />
          <div className="orb-platform" style={{ width: size * 0.88 }} />
        </div>
      )}
    </motion.div>
  )
}
