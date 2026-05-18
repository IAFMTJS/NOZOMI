import { useCallback, type MutableRefObject } from 'react'
import {
  FINISH_WAIT_DEFAULT_MS,
  FINISH_WAIT_HEARD_MS,
  STT_USER_TIMEOUT_MS,
} from '@/features/voice/context/speech-listen/constants'
import {
  endListenSessionAfterTurn,
  finalizeListening,
  getActiveSttEngine,
  getListenSession,
  whenSttWorkIdle,
} from '@/features/voice/logic/speechService'
import { getSttEngine } from '@/features/voice/logic/sttEngine'
import type { VoiceCaptureSnapshot } from '@/features/voice/logic/voiceDebug'
import { voiceDebug, voiceDebugCapture, voiceDebugWarn } from '@/features/voice/logic/voiceDebug'
import { markVoiceSpan } from '@/features/voice/logic/voiceTurnMetrics'
import { setVoicePipelineStep } from '@/features/voice/logic/voicePipelineStep'
import { useUiStore } from '@/store/useUiStore'

export type FinishRecordingDeps = {
  mountedRef: MutableRefObject<boolean>
  processingRef: MutableRefObject<boolean>
  finishingRef: MutableRefObject<boolean>
  resultDeliveredRef: MutableRefObject<boolean>
  everHeardRef: MutableRefObject<boolean>
  pendingInterimRef: MutableRefObject<string>
  lastTranscriptRef: MutableRefObject<string>
  interimRafRef: MutableRefObject<number | null>
  finishFallbackTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>
  captureSnapshot: () => VoiceCaptureSnapshot
  clearFinishWaitTimer: () => void
  stopSilenceEndpoint: () => void
  deliverNoSpeechFallback: () => void
  handleFinalTranscript: (text: string) => Promise<void>
  resolveHeardText: () => string
}

/** Stop capture, wait for STT finalize, then hand off to the conversation engine. */
export function useVoiceFinishRecording(deps: FinishRecordingDeps): () => void {
  const setLiveTranscript = useUiStore((s) => s.setLiveTranscript)
  const setSpeechState = useUiStore((s) => s.setSpeechState)
  const setOrbState = useUiStore((s) => s.setOrbState)
  const setTranscriptFinalizing = useUiStore((s) => s.setTranscriptFinalizing)

  return useCallback(() => {
    if (deps.processingRef.current || deps.finishingRef.current) {
      voiceDebug('ui:finish-skipped', {
        reason: deps.processingRef.current ? 'processing' : 'finishing',
      })
      return
    }
    deps.finishingRef.current = true
    deps.resultDeliveredRef.current = false
    markVoiceSpan('listen_finish')
    setTranscriptFinalizing(true)
    setVoicePipelineStep('stopping-recorder')
    voiceDebugCapture('ui:finish', deps.captureSnapshot())
    deps.stopSilenceEndpoint()
    deps.clearFinishWaitTimer()
    setSpeechState('processing')
    setOrbState('thinking')

    if (deps.interimRafRef.current) {
      cancelAnimationFrame(deps.interimRafRef.current)
      deps.interimRafRef.current = null
    }
    if (deps.pendingInterimRef.current.trim()) {
      deps.lastTranscriptRef.current = deps.pendingInterimRef.current
      setLiveTranscript(deps.pendingInterimRef.current)
    }

    const session = getListenSession()
    if (session && !session.gotResult) {
      finalizeListening()
    } else {
      voiceDebugWarn('ui:finish-no-session', deps.captureSnapshot())
      deps.finishingRef.current = false
      setTranscriptFinalizing(false)
      setSpeechState('idle')
      setOrbState('idle')
      return
    }

    const started = Date.now()
    const engine = getActiveSttEngine() ?? getSttEngine()
    const maxWait =
      engine === 'local'
        ? STT_USER_TIMEOUT_MS + 5_000
        : deps.everHeardRef.current
          ? FINISH_WAIT_HEARD_MS
          : FINISH_WAIT_DEFAULT_MS
    const safetyCap = maxWait
    voiceDebug('ui:finish-wait', {
      maxWaitMs: maxWait,
      everHeard: deps.everHeardRef.current,
    })

    const waitForTranscript = () => {
      if (deps.processingRef.current || deps.resultDeliveredRef.current) return
      if (useUiStore.getState().speechState === 'error') {
        deps.finishingRef.current = false
        return
      }
      if (getListenSession()?.gotResult) {
        deps.finishingRef.current = false
        return
      }
      const heard = deps.resolveHeardText()
      if (heard) {
        setLiveTranscript(heard)
      }
      if (Date.now() - started < maxWait && Date.now() - started < safetyCap) {
        deps.finishFallbackTimer.current = setTimeout(waitForTranscript, 150)
        return
      }
      if (!deps.processingRef.current && !deps.resultDeliveredRef.current) {
        voiceDebugWarn('ui:finish-wait-timeout', {
          waitedMs: Date.now() - started,
          maxWait,
          ...deps.captureSnapshot(),
        })
        void whenSttWorkIdle(engine === 'local' ? STT_USER_TIMEOUT_MS + 6_000 : 8_000).then(() => {
          if (
            !deps.mountedRef.current ||
            deps.processingRef.current ||
            deps.resultDeliveredRef.current
          ) {
            return
          }
          if (getListenSession()?.gotResult) {
            deps.finishingRef.current = false
            return
          }
          const late = deps.resolveHeardText()
          if (late) {
            void deps.handleFinalTranscript(late)
            return
          }
          deps.finishingRef.current = false
          setTranscriptFinalizing(false)
          endListenSessionAfterTurn()
          deps.deliverNoSpeechFallback()
        })
      }
    }
    deps.finishFallbackTimer.current = setTimeout(waitForTranscript, 200)
  }, [
    deps.captureSnapshot,
    deps.clearFinishWaitTimer,
    deps.deliverNoSpeechFallback,
    deps.everHeardRef,
    deps.finishFallbackTimer,
    deps.finishingRef,
    deps.handleFinalTranscript,
    deps.interimRafRef,
    deps.lastTranscriptRef,
    deps.mountedRef,
    deps.pendingInterimRef,
    deps.processingRef,
    deps.resolveHeardText,
    deps.resultDeliveredRef,
    deps.stopSilenceEndpoint,
    setLiveTranscript,
    setOrbState,
    setSpeechState,
    setTranscriptFinalizing,
  ])
}
