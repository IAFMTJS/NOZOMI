import { useEffect, type MutableRefObject } from 'react'
import { PIPELINE_STUCK_RECOVERY_MS } from '@/features/voice/context/speech-listen/constants'
import type { VoiceCaptureSnapshot } from '@/features/voice/logic/voiceDebug'
import { voiceDebugError } from '@/features/voice/logic/voiceDebug'
import { isVoiceSessionBusy } from '@/features/voice/logic/voiceSessionGuard'
import { useUiStore } from '@/store/useUiStore'
import type { LanguageText } from '@/types/domain'

type CancelSession = () => void
type SyncPresenceAfterTurn = () => void

/** Recover when STT finalize hangs (not during engine/TTS phases). */
export function useVoicePipelineStuckRecovery(
  transcriptFinalizing: boolean,
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

  useEffect(() => {
    if (!transcriptFinalizing) return
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      if (!mountedRef.current) return
      if (!useUiStore.getState().transcriptFinalizing) {
        window.clearInterval(timer)
        return
      }
      if (Date.now() - startedAt < PIPELINE_STUCK_RECOVERY_MS) return
      const step = useUiStore.getState().voicePipelineStep
      if (step === 'generating' || step === 'understanding' || step === 'speaking') {
        return
      }
      if (!isVoiceSessionBusy() && useUiStore.getState().speechState !== 'processing') {
        window.clearInterval(timer)
        return
      }
      voiceDebugError('ui:pipeline-stuck-recovery', captureSnapshot())
      window.clearInterval(timer)
      clearFinishWaitTimer()
      finishingRef.current = false
      processingRef.current = false
      setTranscriptFinalizing(false)
      cancelSession()
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
    }, 2_000)
    return () => window.clearInterval(timer)
  }, [
    transcriptFinalizing,
    mountedRef,
    processingRef,
    finishingRef,
    captureSnapshot,
    clearFinishWaitTimer,
    cancelSession,
    deliverNozomi,
    setTranscriptFinalizing,
    syncPresenceAfterTurn,
  ])
}
