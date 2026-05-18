import type { ButtonHTMLAttributes, ReactNode } from 'react'
import {
  deriveListenPhase,
  derivePresenceOrbState,
} from '@/features/voice/logic/listenPresence'
import { useUiStore } from '@/store/useUiStore'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean
  children: ReactNode
}

/** Decorative chrome + accessible button wrapper for the main presence orb. */
export function PresenceOrbShell({
  busy,
  className = '',
  children,
  ...rest
}: Props) {
  const speechState = useUiStore((s) => s.speechState)
  const orbState = useUiStore((s) => s.orbState)
  const transcriptFinalizing = useUiStore((s) => s.transcriptFinalizing)
  const displayOrb = derivePresenceOrbState(speechState, orbState)
  const phase = deriveListenPhase(speechState, orbState, transcriptFinalizing)

  return (
    <button
      type="button"
      data-orb-state={displayOrb}
      data-listen-phase={phase}
      className={`presence-orb-anchor touch-target touch-manipulation${
        busy ? ' presence-orb-anchor--busy' : ''
      }${className ? ` ${className}` : ''}`}
      aria-busy={busy || undefined}
      {...rest}
    >
      <span className="presence-orb-aurora" aria-hidden />
      <span className="presence-orb-glow" aria-hidden />
      <span className="presence-orb-ring" aria-hidden />
      <span className="presence-orb-shimmer" aria-hidden />
      {children}
    </button>
  )
}
