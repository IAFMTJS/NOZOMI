import {
  appendAccumulatedFinal,
  bindListeningHandlers,
  bumpListenGeneration,
  commitTranscript,
  dispatch,
  getAccumulatedFinal,
  getBoundOnLevel,
  getCapturedTranscript,
  getListenGeneration,
  getListenSession,
  getListenSignals,
  isFinishRequested,
  rememberTranscript,
  scheduleFinalizeCommit,
  setActiveListenLang,
  setActiveSttEngine,
  setFinishRequested,
  setListenSession,
  setPendingTranscript,
  setRecognition,
  setSignalAudioStart,
  setSignalSoundStart,
  setSignalSpeechStart,
  stopMicVisualizer,
} from '@/features/voice/logic/listenStore'
import { createAudioLevelLoop } from '@/features/voice/logic/listenLifecycle'
import {
  isMicRecentlyPrimed,
  mapSpeechRecognitionError,
} from '@/features/voice/logic/speechCapabilities'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import type { SpeechCallbacks, StartListeningOptions } from '@/features/voice/logic/types'
import { voiceDebug, voiceDebugError, voiceDebugWarn } from '@/features/voice/logic/voiceDebug'
import { resetListenSessionState } from '@/features/voice/logic/listenStore'
import { useUiStore } from '@/store/useUiStore'

function shouldHoldIdleDuringPipeline(): boolean {
  const ui = useUiStore.getState()
  return (
    ui.transcriptFinalizing ||
    ui.speechState === 'processing' ||
    ui.voicePipelineStep === 'transcribing' ||
    ui.voicePipelineStep === 'stopping-recorder'
  )
}

let browserLevelLoop: ReturnType<typeof createAudioLevelLoop> | null = null

export function stopBrowserAudioLevel(): void {
  browserLevelLoop?.stop()
  browserLevelLoop = null
  stopMicVisualizer()
}

function startBrowserLevelLoop(onLevel: (n: number) => void): void {
  stopBrowserAudioLevel()
  browserLevelLoop = createAudioLevelLoop(onLevel)
  void browserLevelLoop.start()
}

export function startBrowserListening(
  callbacks: SpeechCallbacks,
  options: StartListeningOptions = {},
): void {
  const w = window as Window & {
    SpeechRecognition?: typeof SpeechRecognition
    webkitSpeechRecognition?: typeof SpeechRecognition
  }
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!SR) {
    dispatch('onError', {
      code: 'not-supported',
      message: 'Speech recognition not supported — use Chrome or Edge',
    })
    dispatch('onStateChange', 'error')
    return
  }

  if (!window.isSecureContext) {
    dispatch('onError', {
      code: 'not-allowed',
      message: 'Microphone requires HTTPS or localhost',
    })
    dispatch('onStateChange', 'error')
    return
  }

  resetListenSessionState()
  bindListeningHandlers(callbacks)

  const generation = bumpListenGeneration()
  const lang = options.lang ?? resolveSpeechRecognitionLang('auto')
  setActiveSttEngine('browser')
  setActiveListenLang(lang)
  setListenSession({ stopped: false, gotResult: false })

  const recognition = new SR()
  setRecognition(recognition)
  recognition.lang = lang
  voiceDebug('stt:start', {
    generation,
    lang: recognition.lang,
    micPrimed: isMicRecentlyPrimed(),
    secure: window.isSecureContext,
  })
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 3

  const isActive = (): boolean => {
    const session = getListenSession()
    return (
      getListenGeneration() === generation &&
      !!session &&
      !session.stopped &&
      !session.gotResult
    )
  }

  recognition.onaudiostart = () => {
    setSignalAudioStart()
    voiceDebug('stt:audiostart', { generation })
  }
  recognition.onsoundstart = () => {
    setSignalSoundStart()
    voiceDebug('stt:soundstart', { generation })
  }
  recognition.onspeechstart = () => {
    setSignalSpeechStart()
    voiceDebug('stt:speechstart', { generation })
  }
  recognition.onspeechend = () => {
    voiceDebug('stt:speechend', { generation })
  }
  recognition.onnomatch = () => {
    voiceDebugWarn('stt:nomatch', { generation })
  }

  recognition.onstart = () => {
    if (!isActive()) return
    voiceDebug('stt:onstart', { generation })
    dispatch('onStateChange', 'listening')
    const onLevel = getBoundOnLevel()
    if (onLevel) startBrowserLevelLoop(onLevel)
  }

  recognition.onend = () => {
    if (isFinishRequested()) {
      setFinishRequested(false)
      voiceDebug('stt:onend-finish', {
        generation,
        captured: getCapturedTranscript().slice(0, 160),
        signals: getListenSignals(),
      })
      const session = getListenSession()
      if (session && !session.gotResult) {
        scheduleFinalizeCommit(generation, 0)
      }
      return
    }
    if (!isActive()) {
      const session = getListenSession()
      voiceDebug('stt:onend-idle', { generation, gotResult: session?.gotResult })
      stopBrowserAudioLevel()
      if (!session?.gotResult && !isFinishRequested() && !shouldHoldIdleDuringPipeline()) {
        dispatch('onStateChange', 'idle')
      }
      return
    }
    const captured = getCapturedTranscript()
    if (captured) {
      voiceDebug('stt:onend-commit', { generation, length: captured.length })
      commitTranscript(captured, generation)
      return
    }
    const session = getListenSession()
    if (session?.stopped) {
      voiceDebug('stt:onend-hold', { generation })
      scheduleFinalizeCommit(generation, 0)
      return
    }
    voiceDebug('stt:onend-restart', { generation, signals: getListenSignals() })
    try {
      recognition.start()
    } catch {
      voiceDebugWarn('stt:onend-restart-failed', { generation })
      stopBrowserAudioLevel()
      if (!shouldHoldIdleDuringPipeline()) {
        dispatch('onStateChange', 'idle')
      }
    }
  }

  recognition.onerror = (ev) => {
    const code = ev.error
    if (code === 'no-speech') {
      voiceDebug('stt:no-speech', {
        finishRequested: isFinishRequested(),
        stopped: getListenSession()?.stopped,
        signals: getListenSignals(),
      })
      if (isFinishRequested() || getListenSession()?.stopped) {
        scheduleFinalizeCommit(generation, 0)
      }
      return
    }
    if (code === 'aborted') {
      voiceDebug('stt:aborted', { generation })
      return
    }
    if (!isActive()) return
    voiceDebugError('stt:error', { code, generation })
    const session = getListenSession()
    if (session) session.stopped = true
    stopBrowserAudioLevel()
    dispatch('onStateChange', 'error')
    dispatch('onError', mapSpeechRecognitionError(code))
  }

  recognition.onresult = (ev) => {
    let interim = ''
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const chunk = ev.results[i]
      const text = chunk[0]?.transcript ?? ''
      if (chunk.isFinal) appendAccumulatedFinal(text)
      else interim = text
    }
    setPendingTranscript(getAccumulatedFinal().trim())
    const display = `${getAccumulatedFinal()}${interim}`.trim()
    rememberTranscript(display)
    if (!display) return
    const session = getListenSession()
    if (isFinishRequested() && session && !session.gotResult) {
      voiceDebug('stt:onresult-finish-commit', {
        length: display.length,
        finalsLen: getAccumulatedFinal().length,
      })
      commitTranscript(display, generation)
      return
    }
    voiceDebug('stt:interim', {
      length: display.length,
      resultIndex: ev.resultIndex,
      results: ev.results.length,
    })
    dispatch('onInterim', display)
  }

  dispatch('onStateChange', 'permission_pending')

  const tryStart = (): boolean => {
    if (!isActive()) return false
    try {
      recognition.start()
      return true
    } catch {
      return false
    }
  }

  const scheduleStartAttempts = () => {
    let attempts = 0
    const attempt = () => {
      if (!isActive()) return
      if (tryStart()) return
      attempts += 1
      if (attempts < 5) {
        window.setTimeout(attempt, 80 * attempts)
        return
      }
      const session = getListenSession()
      if (session) session.stopped = true
      dispatch('onStateChange', 'error')
      dispatch('onError', {
        code: 'start-failed',
        message: 'Could not start speech recognition — tap retry',
      })
    }
    window.setTimeout(attempt, 30)
  }

  voiceDebug('stt:direct-start', { generation, micPrimed: isMicRecentlyPrimed() })
  if (tryStart()) return
  scheduleStartAttempts()
}
