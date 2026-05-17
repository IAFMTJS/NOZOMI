import { runRecordedFinalizeForGeneration } from '@/systems/speech/recordedSttListen'
import { startBrowserListening } from '@/systems/speech/browserSttListen'
import { startRecordedListening } from '@/systems/speech/recordedSttListen'
import {
  abortRecognitionSafe,
  bindListeningHandlers,
  bumpListenGeneration,
  clearSessionTranscriptOnly,
  dispatch,
  getActiveSttEngine,
  getCapturedTranscript,
  getListenGeneration,
  getListenSession,
  getSttDebugState,
  isFinishRequested,
  markListenTurnHandledInStore,
  resetListenSessionState,
  scheduleFinalizeCommit,
  setFinalizeWatchdog,
  setFinishRequested,
  stopMicVisualizer,
  stopRecognitionSafe,
} from '@/systems/speech/listenStore'
import {
  acquireSharedMicrophone,
  clearSharedMicStreamIf,
  getSharedMicStream,
  releaseSharedMicrophone,
} from '@/systems/speech/speechCapabilities'
import { levelFromRms, rmsFromTimeDomain } from '@/systems/speech/audioLevel'
import { clearSessionSttEngine, getSttEngine } from '@/systems/speech/sttEngine'
import type { SpeechCallbacks, StartListeningOptions } from '@/systems/speech/types'
import { voiceDebug, voiceDebugWarn } from '@/systems/speech/voiceDebug'
export {
  attachListeningCallbacks,
  bindListeningHandlers,
  getCapturedTranscript,
  getListenSignals,
  getPendingTranscript,
  getSttDebugState,
  isListenSessionActive,
  markListenArmedFromGesture,
  consumeListenArmedFromGesture,
  syncCaptureFromDisplay,
  whenSttWorkIdle,
} from '@/systems/speech/listenStore'

export function startListening(
  callbacks: SpeechCallbacks,
  options: StartListeningOptions = {},
): void {
  bindListeningHandlers(callbacks)

  if (!window.isSecureContext) {
    dispatch('onError', {
      code: 'not-allowed',
      message: 'Microphone requires HTTPS or localhost',
    })
    dispatch('onStateChange', 'error')
    return
  }

  if (getSttEngine() === 'local') {
    startRecordedListening(callbacks, options)
    return
  }
  startBrowserListening(callbacks, options)
}

export function finalizeListening(): void {
  const session = getListenSession()
  if (!session || session.gotResult) {
    voiceDebug('stt:finalize-skip', {
      hasSession: !!session,
      gotResult: session?.gotResult,
    })
    return
  }
  setFinishRequested(true)
  const generation = getListenGeneration()
  voiceDebug('stt:finalize', {
    engine: getActiveSttEngine(),
    captured: getCapturedTranscript().slice(0, 160),
    session,
    finishRequested: isFinishRequested(),
  })
  session.stopped = true

  if (getActiveSttEngine() === 'local') {
    runRecordedFinalizeForGeneration(generation)
    return
  }

  stopMicVisualizer()
  scheduleFinalizeCommit(generation, 0)
  stopRecognitionSafe()
  setFinalizeWatchdog(
    setTimeout(() => {
      setFinalizeWatchdog(null)
      const current = getListenSession()
      if (getListenGeneration() === generation && current && !current.gotResult) {
        voiceDebugWarn('stt:onend-watchdog', { generation })
        abortRecognitionSafe()
        scheduleFinalizeCommit(generation, 0)
      }
    }, 450),
  )
}

export function cancelListening(): void {
  voiceDebug('stt:cancel', getSttDebugState())
  bumpListenGeneration()
  resetListenSessionState()
  releaseSharedMicrophone()
  clearSessionSttEngine()
}

export function markListenTurnHandled(): void {
  markListenTurnHandledInStore()
}

export function endListenSessionAfterTurn(): void {
  clearSessionTranscriptOnly()
  cancelListening()
}

export function stopListening(): void {
  cancelListening()
}

export function createAudioLevelLoop(
  onLevel: (n: number) => void,
): { start: () => Promise<void>; stop: () => void } {
  let raf = 0
  let ctx: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let ownedStream: MediaStream | null = null
  const data = new Uint8Array(256)

  const tick = () => {
    if (!analyser) return
    analyser.getByteTimeDomainData(data)
    onLevel(levelFromRms(rmsFromTimeDomain(data), 4))
    raf = requestAnimationFrame(tick)
  }

  return {
    start: async () => {
      try {
        let stream = getSharedMicStream()
        if (!stream?.active) {
          stream = await acquireSharedMicrophone()
          if (stream) ownedStream = stream
        }
        if (!stream) {
          onLevel(0)
          return
        }
        ctx = new AudioContext()
        if (ctx.state === 'suspended') await ctx.resume()
        const source = ctx.createMediaStreamSource(stream)
        analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)
        tick()
      } catch {
        onLevel(0)
      }
    },
    stop: () => {
      cancelAnimationFrame(raf)
      void ctx?.close()
      ctx = null
      analyser = null
      onLevel(0)
      if (ownedStream) {
        ownedStream.getTracks().forEach((t) => t.stop())
        clearSharedMicStreamIf(ownedStream)
        ownedStream = null
      }
    },
  }
}
