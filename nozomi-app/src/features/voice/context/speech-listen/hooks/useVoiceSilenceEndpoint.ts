import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react'
import { createSilenceEndpointing } from '@/features/voice/logic/silenceEndpointing'
import { shouldAutoStopListening } from '@/features/voice/logic/voiceSettings'
import { useUiStore } from '@/store/useUiStore'
import type { AppSettings, SpeechState } from '@/types/domain'

/** Auto-finish listening after silence when listenEndMode allows it. */
export function useVoiceSilenceEndpoint(
  appSettings: AppSettings,
  speechState: SpeechState,
  finishRecording: () => void,
  processingRef: MutableRefObject<boolean>,
  finishingRef: MutableRefObject<boolean>,
): RefObject<ReturnType<typeof createSilenceEndpointing> | null> {
  const silenceEndpointRef = useRef<ReturnType<typeof createSilenceEndpointing> | null>(null)

  useEffect(() => {
    if (!shouldAutoStopListening(appSettings) || speechState !== 'listening') {
      silenceEndpointRef.current?.stop()
      return
    }
    const ep = createSilenceEndpointing({
      getLevel: () => useUiStore.getState().audioLevel,
      isActive: () =>
        useUiStore.getState().speechState === 'listening' &&
        !processingRef.current &&
        !finishingRef.current,
      onEndpoint: () => finishRecording(),
    })
    silenceEndpointRef.current = ep
    ep.start()
    return () => ep.stop()
  }, [
    appSettings.listenEndMode,
    appSettings.voiceListenMode,
    speechState,
    finishRecording,
    processingRef,
    finishingRef,
  ])

  return silenceEndpointRef
}

