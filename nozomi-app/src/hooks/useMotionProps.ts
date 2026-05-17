import { useNozomiStore } from '@/store/useNozomiStore'

export type MotionDivProps = {
  initial?: { opacity?: number; y?: number } | false
  animate?: { opacity?: number; y?: number }
  transition?: { duration?: number }
}

/** Framer Motion props that respect the reduced-motion setting */
export function useMotionProps(animated: MotionDivProps = {}): MotionDivProps {
  const reduced = useNozomiStore((s) => s.settings.reducedMotion)
  if (reduced) {
    return { initial: false, animate: undefined, transition: { duration: 0 } }
  }
  return animated
}
