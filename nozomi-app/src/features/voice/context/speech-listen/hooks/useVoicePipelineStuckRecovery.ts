import { useCallback, useEffect, type MutableRefObject } from 'react'
import {
  FINALIZE_STUCK_MS,
  PROCESSING_STUCK_MS,
} from '@/features/voice/context/speech-listen/constants'
import type { VoiceCaptureSnapshot } from '@/features/voice/logic/voiceDebug'
import { voiceDebugError } from '@/features/voice/logic/voiceDebug'
import { isAnyTtsOutputActive } from '@/features/voice/logic/ttsOutputState'
import { isVoiceSessionBusy } from '@/features/voice/logic/voiceSessionGuard'
import { forceRecoverVoiceUi } from '@/features/voice/logic/voiceTurnCoordinator'
import { useUiStore } from '@/store/useUiStore'
import type { LanguageText } from '@/types/domain'

type CancelSession = () => void
type SyncPresenceAfterTurn = () => void

const STUCK_POLL_MS = 2_000

function isFinalizeStepStuck(): boolean {
  const step = useUiStore.getState().voicePipelineStep
  return step === 'transcribing' || step === 'stopping-recorder'
}

function isEngineStepStuck(): boolean {
  const step = useUiStore.getState().voicePipelineStep
  return step === 'generating' || step === 'understanding'
}

/** Recover when STT finalize or post-STT engine phases hang. */
export function useVoicePipelineStuckRecovery(
  transcriptFinalizing: boolean,
  speechState: string,
  mountedRef: MutableRefObject<boolean>,
  processingRef: MutableRefObject<boolean>,
  finishingRef: MutableRefObject<boolean>,
  captureSnapshot: () => VoiceCaptureSnapshot,
  clearFinishWaitTimer: () => void,
  cancelSession: CancelSession,
  deliverNozomi: (
    text: LanguageText,
    topic?: string,
    meta?: { grammarTags?: string; sentenceId?: number },
    surface?: 'chat' | 'voice',
  ) => void,
  syncPresenceAfterTurn: SyncPresenceAfterTurn,
): void {
  const setTranscriptFinalizing = useUiStore((s) => s.setTranscriptFinalizing)

  const runRecovery = useCallback(
    (reason: string) => {
      voiceDebugError('ui:pipeline-stuck-recovery', { reason, ...captureSnapshot() })
      clearFinishWaitTimer()
      finishingRef.current = false
      processingRef.current = false
      setTranscriptFinalizing(false)
      cancelSession()
      forceRecoverVoiceUi(reason)
      deliverNozomi(
        {
          jp: '音声の処理が途中で止まりました。もう一度話してみて。',
          romaji: 'Onsei no shori ga tochuu de tomarimashita.',
          en: 'Audio processing stopped partway. Please try speaking again.',
        },
        'daily',
        undefined,
        'voice',
      )
      syncPresenceAfterTurn()
    },
    [
      captureSnapshot,
      clearFinishWaitTimer,
      cancelSession,
      deliverNozomi,
      finishingRef,
      processingRef,
      setTranscriptFinalizing,
      syncPresenceAfterTurn,
    ],
  )

  useEffect(() => {
    if (!transcriptFinalizing) return
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      if (!mountedRef.current) return
      if (!useUiStore.getState().transcriptFinalizing) {
        window.clearInterval(timer)
        return
      }
      if (Date.now() - startedAt < FINALIZE_STUCK_MS) return
      if (isEngineStepStuck() || isAnyTtsOutputActive()) {
        window.clearInterval(timer)
        return
      }
      if (!isVoiceSessionBusy() && useUiStore.getState().speechState !== 'processing') {
        window.clearInterval(timer)
        return
      }
      window.clearInterval(timer)
      runRecovery('finalize-stuck')
    }, STUCK_POLL_MS)
    return () => window.clearInterval(timer)
  }, [transcriptFinalizing, mountedRef, runRecovery])

  useEffect(() => {
    if (speechState !== 'processing' || transcriptFinalizing) return
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      if (!mountedRef.current) return
      const ui = useUiStore.getState()
      if (ui.speechState !== 'processing' || ui.transcriptFinalizing) {
        window.clearInterval(timer)
        return
      }
      if (Date.now() - startedAt < PROCESSING_STUCK_MS) return
      if (isAnyTtsOutputActive() || ui.orbState === 'speaking') {
        window.clearInterval(timer)
        return
      }
      if (!isEngineStepStuck() && !isFinalizeStepStuck()) {
        window.clearInterval(timer)
        return
      }
      window.clearInterval(timer)
      runRecovery('processing-stuck')
    }, STUCK_POLL_MS)
    return () => window.clearInterval(timer)
  }, [speechState, transcriptFinalizing, mountedRef, runRecovery])
}
