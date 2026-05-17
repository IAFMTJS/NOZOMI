import { motion } from 'framer-motion'
import type { OrbState } from '@/types/domain'

interface Props {
  size: number
  state: OrbState
  pulse?: boolean
}

export function StaticOrbVisual({ size, state, pulse = false }: Props) {
  return (
    <motion.div
      className={`orb-static-core absolute rounded-full${
        pulse && state === 'listening' ? ' orb-static-core--listening' : ''
      }`}
      data-orb-state={state}
      animate={{
        opacity: state === 'thinking' ? [0.75, 1, 0.75] : 0.92,
        scale: state === 'speaking' ? [1, 1.02, 1] : 1,
      }}
      transition={{
        duration: state === 'thinking' ? 1.8 : 2.4,
        repeat: state === 'idle' ? 0 : Infinity,
        ease: 'easeInOut',
      }}
      style={{ width: size * 0.88, height: size * 0.88 }}
      aria-hidden
    />
  )
}
