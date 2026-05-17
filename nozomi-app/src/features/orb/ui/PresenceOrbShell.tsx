import type { ButtonHTMLAttributes, ReactNode } from 'react'
import {
  deriveListenPhase,
  derivePresenceOrbState,
} from '@/features/voice/logic/listenPresence'
import { useUiStore } from '@/store/useUiStore'
import type { OrbState, SpeechState } from '@/types/domain'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  speechState: SpeechState
  orbState: OrbState
  busy?: boolean
  children: ReactNode
}

/** Decorative chrome + accessible button wrapper for the main presence orb. */
export function PresenceOrbShell({
  speechState,
  orbState,
  busy,
  className = '',
  children,
  ...rest
}: Props) {
  const transcriptFinalizing = useUiStore((s) => s.transcriptFinalizing)
  const displayOrb = derivePresenceOrbState(speechState, orbState)
  const phase = deriveListenPhase(speechState, orbState, transcriptFinalizing)

  return (
    <button
      type="button"
      data-orb-state={displayOrb}
      data-listen-phase={phase}
      className={`presence-orb-anchor touch-target touch-manipulation${
        busy ? ' presence-orb-anchor--busy opacity-90' : ''
      }${className ? ` ${className}` : ''}`}
      aria-busy={busy || undefined}
      {...rest}
    >
      <span className="presence-orb-aurora" aria-hidden />
      <span className="presence-orb-glow" aria-hidden />
      <span className="presence-orb-ring" aria-hidden />
      {children}
    </button>
  )
}
