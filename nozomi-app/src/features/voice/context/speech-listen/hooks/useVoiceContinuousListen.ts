import { useEffect, type MutableRefObject } from 'react'
import { useNozomiStore } from '@/store/useNozomiStore'
import { afterSpeechOutputForListen } from '@/features/voice/logic/startListenPipeline'
import {
  bumpContinuousGeneration,
  isContinuousGenerationCurrent,
} from '@/features/voice/logic/voiceTurnBridge'
import { isContinuousListenMode } from '@/features/voice/logic/voiceSettings'
import {
  setOnSpeechOutputEnded,
} from '@/features/voice/logic/voiceSessionContinuity'

type BeginListening = () => boolean

/** Re-open the mic after TTS when voiceListenMode is continuous and user is on /listen. */
export function useVoiceContinuousListen(
  beginListening: BeginListening,
  mountedRef: MutableRefObject<boolean>,
  processingRef: MutableRefObject<boolean>,
  finishingRef: MutableRefObject<boolean>,
): void {
  useEffect(() => {
    setOnSpeechOutputEnded(() => {
      if (!isContinuousListenMode(useNozomiStore.getState().settings)) return
      if (window.location.pathname !== '/listen') return
      if (processingRef.current || finishingRef.current) return
      const gen = bumpContinuousGeneration()
      void (async () => {
        await afterSpeechOutputForListen()
        if (!mountedRef.current || !isContinuousGenerationCurrent(gen)) return
        if (processingRef.current || finishingRef.current) return
        beginListening()
      })()
    })
    return () => setOnSpeechOutputEnded(null)
  }, [beginListening, finishingRef, mountedRef, processingRef])
}
