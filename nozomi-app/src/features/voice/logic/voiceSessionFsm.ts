import { resetOrbAudioLevel } from '@/features/orb/logic/orbAudioLevel'
import { clearTranscriptFinalizing } from '@/features/voice/logic/speechPresenceSync'
import { isAnyTtsOutputActive } from '@/features/voice/logic/ttsOutputState'
import {
  resetVoicePipelineStep,
  setVoicePipelineStep,
  type VoicePipelineStep,
} from '@/features/voice/logic/voicePipelineStep'
import { voiceDebug, voiceDebugWarn } from '@/features/voice/logic/voiceDebug'
import { useUiStore } from '@/store/useUiStore'
import type { OrbState, SpeechState } from '@/types/domain'

/** Single source of truth for voice UI lifecycle (boot gate uses `voiceBootLoadPhase` separately). */
export type VoiceSessionPhase =
  | 'booting'
  | 'requesting_permission'
  | 'initializing_audio'
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'responding'
  | 'interrupted'
  | 'retrying'
  | 'error'

type FsmSnapshot = {
  phase: VoiceSessionPhase
  previousPhase: VoiceSessionPhase | null
  enteredAt: number
  lastReason: string
}

let snapshot: FsmSnapshot = {
  phase: 'idle',
  previousPhase: null,
  enteredAt: Date.now(),
  lastReason: 'init',
}

function logTransition(from: VoiceSessionPhase, to: VoiceSessionPhase, reason: string): void {
  voiceDebug('voice:fsm', {
    from,
    to,
    reason,
    msInPrev: Date.now() - snapshot.enteredAt,
  })
}

function uiFromPhase(phase: VoiceSessionPhase): {
  speech: SpeechState
  orb: OrbState
  pipeline: VoicePipelineStep
  transcriptFinalizing: boolean
} {
  switch (phase) {
    case 'booting':
      return {
        speech: 'idle',
        orb: 'idle',
        pipeline: 'idle',
        transcriptFinalizing: false,
      }
    case 'requesting_permission':
      return {
        speech: 'permission_pending',
        orb: 'idle',
        pipeline: 'preparing',
        transcriptFinalizing: false,
      }
    case 'initializing_audio':
      return {
        speech: 'permission_pending',
        orb: 'idle',
        pipeline: 'preparing',
        transcriptFinalizing: false,
      }
    case 'listening':
      return {
        speech: 'listening',
        orb: 'listening',
        pipeline: 'listening',
        transcriptFinalizing: false,
      }
    case 'transcribing':
      return {
        speech: 'processing',
        orb: 'thinking',
        pipeline: 'transcribing',
        transcriptFinalizing: true,
      }
    case 'thinking':
      return {
        speech: 'processing',
        orb: 'thinking',
        pipeline: 'understanding',
        transcriptFinalizing: false,
      }
    case 'responding':
      return {
        speech: 'speaking',
        orb: 'speaking',
        pipeline: 'speaking',
        transcriptFinalizing: false,
      }
    case 'interrupted':
      return {
        speech: 'permission_pending',
        orb: 'idle',
        pipeline: 'preparing',
        transcriptFinalizing: false,
      }
    case 'retrying':
      return {
        speech: 'permission_pending',
        orb: 'idle',
        pipeline: 'preparing',
        transcriptFinalizing: false,
      }
    case 'error':
      return {
        speech: 'error',
        orb: 'idle',
        pipeline: 'error',
        transcriptFinalizing: false,
      }
    case 'idle':
    default:
      return {
        speech: 'idle',
        orb: 'idle',
        pipeline: 'idle',
        transcriptFinalizing: false,
      }
  }
}

function applyPhaseToUi(phase: VoiceSessionPhase): void {
  const mapped = uiFromPhase(phase)
  const ui = useUiStore.getState()
  ui.setVoiceSessionPhase(phase)
  ui.setSpeechState(mapped.speech)
  if (!isAnyTtsOutputActive() || phase === 'responding') {
    ui.setOrbState(mapped.orb)
  }
  setVoicePipelineStep(mapped.pipeline)
  ui.setTranscriptFinalizing(mapped.transcriptFinalizing)
}

export function getVoiceSessionPhase(): VoiceSessionPhase {
  return snapshot.phase
}

export function getVoiceSessionFsmSnapshot(): Readonly<FsmSnapshot> {
  return snapshot
}

/** Allowed transitions — illegal jumps are logged and coerced to the closest valid phase. */
export function transitionVoiceSession(
  to: VoiceSessionPhase,
  reason: string,
  options?: { force?: boolean },
): void {
  const from = snapshot.phase
  if (from === to) return

  if (!options?.force && !canTransition(from, to)) {
    voiceDebugWarn('voice:fsm-blocked', { from, to, reason })
    return
  }

  logTransition(from, to, reason)
  snapshot = {
    phase: to,
    previousPhase: from,
    enteredAt: Date.now(),
    lastReason: reason,
  }
  applyPhaseToUi(to)
}

function canTransition(from: VoiceSessionPhase, to: VoiceSessionPhase): boolean {
  if (to === 'error' || to === 'idle') return true
  if (from === 'idle' && (to === 'thinking' || to === 'responding')) return true
  if (from === 'error' && (to === 'retrying' || to === 'requesting_permission')) return true
  const order: VoiceSessionPhase[] = [
    'booting',
    'requesting_permission',
    'initializing_audio',
    'listening',
    'transcribing',
    'thinking',
    'responding',
    'idle',
  ]
  const fromIdx = order.indexOf(from)
  const toIdx = order.indexOf(to)
  if (fromIdx >= 0 && toIdx >= 0) {
    if (toIdx >= fromIdx - 1) return true
  }
  if (to === 'interrupted') return from === 'responding' || from === 'thinking'
  if (from === 'interrupted' && (to === 'listening' || to === 'requesting_permission')) {
    return true
  }
  if (from === 'responding' && to === 'listening') return true
  if (from === 'thinking' && to === 'transcribing') return false
  if (from === 'listening' && to === 'requesting_permission') return false
  if (from === 'transcribing' && to === 'listening') return false
  return false
}

export function orbStateForVoiceSessionPhase(phase: VoiceSessionPhase): OrbState {
  return uiFromPhase(phase).orb
}

export function resetVoiceSessionFsm(reason: string): void {
  clearTranscriptFinalizing()
  resetVoicePipelineStep()
  resetOrbAudioLevel()
  const ui = useUiStore.getState()
  ui.setAudioLevel(0)
  transitionVoiceSession('idle', reason, { force: true })
}

export function enterVoiceSessionError(reason: string): void {
  transitionVoiceSession('error', reason, { force: true })
}
