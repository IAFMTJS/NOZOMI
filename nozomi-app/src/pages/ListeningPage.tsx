import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/ui/AppHeader'
import { useConversation } from '@/features/conversation'
import {
  NozomiOrb,
  OrbAmbienceBridge,
  PresenceOrbShell,
  WaveformStrip,
} from '@/features/orb'
import {
  ChatHistorySheet,
  FloatingTurnBubbles,
  PresenceDock,
  PresenceStatusRow,
  PresenceSuggestions,
  StoryModeToggle,
  suggestionKey,
} from '@/features/presence'
import {
  ListeningMicHint,
  LiveTranscript,
  MicPermissionBanner,
  isListenSessionActive,
  isMicRecorderActive,
  micNeedsSecureContext,
  speakJapanese,
  speechSupported,
  startMicCaptureFromGesture,
  stopSpeaking,
  useListenPhase,
  useSpeechListen,
  useSpeechOutputActive,
} from '@/features/voice'
import { VoiceDebugOverlay } from '@/features/voice/ui/VoiceDebugOverlay'
import {
  cancelScheduledReleaseOfflineStt,
  scheduleReleaseOfflineSttPipeline,
} from '@/features/voice/logic/offlineSttLifecycle'
import { getSttEngine, resolveSttEngineForLang } from '@/features/voice/logic/sttEngine'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'
import { useOrbSize } from '@/hooks/useVisualViewportHeight'
import { isMobileDevice } from '@/utils/device'
import { isVoiceSessionBusy } from '@/features/voice/logic/voiceSessionGuard'
import { micNeedsHttpsLabel } from '@/utils/devConnect'

import type { ScenarioCategory } from '@/types/domain'

type ListenLocationState = {
  /** @deprecated use sessionArmed */
  autoStart?: boolean
  /** Home orb armed listen — start exactly once on this navigation. */
  sessionArmed?: boolean
  scenarioStart?: ScenarioCategory
  storyStart?: number
}

export function ListeningPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const speechState = useUiStore((s) => s.speechState)
  const orbState = useUiStore((s) => s.orbState)
  const dataReady = useUiStore((s) => s.dataReady)
  const messages = useNozomiStore((s) => s.voiceMessages)
  const voiceSuggestions = useNozomiStore((s) => s.voiceSuggestions)
  const voicePinnedSuggestion = useNozomiStore((s) => s.voicePinnedSuggestion)
  const setVoicePinnedSuggestion = useNozomiStore((s) => s.setVoicePinnedSuggestion)
  const settings = useNozomiStore((s) => s.settings)
  const {
    startVoiceConversation,
    startScenarioConversation,
    startStoryConversation,
    setVoiceStoryMode,
  } = useConversation()
  const voiceTurnCount = useNozomiStore((s) => s.voiceSession.turnCount)
  const voiceStoryMode = useNozomiStore((s) => s.settings.voiceStoryMode)
  const showStoryToggle = voiceTurnCount >= 2 || voiceStoryMode
  const {
    beginListening,
    finishRecording,
    cancelSession,
    attachToActiveSession,
    detachUi,
    errorCode,
    clearError,
    offlineSttReady,
  } = useSpeechListen()
  const [historyOpen, setHistoryOpen] = useState(false)
  const recognitionLang = resolveSpeechRecognitionLang(settings.speechInputLang)
  const usesLocalStt = useMemo(
    () => resolveSttEngineForLang(getSttEngine(), recognitionLang) === 'local',
    [recognitionLang],
  )

  const needsHttps = micNeedsSecureContext()
  const micBlocked = needsHttps || !speechSupported().stt
  const sessionError = Boolean(errorCode) && speechState === 'error'
  const listenPhase = useListenPhase()
  const isListening = listenPhase === 'capturing'
  const isPreparing = listenPhase === 'preparing'
  const isFinalizing = listenPhase === 'finalizing'
  const isProcessing = listenPhase === 'processing'
  const isCapturing = isListening || isPreparing
  const speechOutputActive = useSpeechOutputActive()
  const showInterruptHint =
    speechOutputActive || orbState === 'speaking'
  const orbBusy = isPreparing || isFinalizing || isProcessing
  const canBeginOrb =
    listenPhase === 'idle' && !speechOutputActive
  const dockBeginDisabled =
    listenPhase !== 'idle' && listenPhase !== 'speaking'
  const hasTurn = messages.length > 0
  const showReplyUi =
    hasTurn &&
    listenPhase === 'idle' &&
    voiceSuggestions.length > 0

  const orbPreferred = isMobileDevice() ? 300 : 340
  const orbReserved = isMobileDevice() ? 300 : 260
  const orbSize = useOrbSize(orbPreferred, orbReserved)

  const bootedRef = useRef(false)
  const listenBootKeyRef = useRef<string | null>(null)
  const voiceOpenedRef = useRef(false)
  const listenMountedRef = useRef(false)
  const leaveCancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const pinnedSuggestionKey = voicePinnedSuggestion
    ? suggestionKey(
        voicePinnedSuggestion,
        Math.max(
          0,
          voiceSuggestions.findIndex((s) => s.jp === voicePinnedSuggestion.jp),
        ),
      )
    : null

  useEffect(() => {
    if (!dataReady || voiceOpenedRef.current) return
    const navState = location.state as ListenLocationState | null
    if (navState?.storyStart != null) {
      voiceOpenedRef.current = true
      void startStoryConversation(navState.storyStart, 'voice')
      window.history.replaceState(
        navState.autoStart || navState.sessionArmed ? { sessionArmed: true } : {},
        document.title,
      )
      return
    }
    if (navState?.scenarioStart) {
      voiceOpenedRef.current = true
      void startScenarioConversation(navState.scenarioStart, 'voice')
      window.history.replaceState(
        navState.autoStart || navState.sessionArmed ? { sessionArmed: true } : {},
        document.title,
      )
      return
    }
    if (messages.length > 0) return
    voiceOpenedRef.current = true
    void startVoiceConversation()
  }, [
    dataReady,
    location.state,
    messages.length,
    startScenarioConversation,
    startStoryConversation,
    startVoiceConversation,
  ])

  const usesLocalSttRef = useRef(usesLocalStt)
  usesLocalSttRef.current = usesLocalStt

  useEffect(() => {
    listenMountedRef.current = true
    if (usesLocalSttRef.current) cancelScheduledReleaseOfflineStt()
    if (leaveCancelTimerRef.current) {
      clearTimeout(leaveCancelTimerRef.current)
      leaveCancelTimerRef.current = null
    }
    clearError()

    const navState = location.state as ListenLocationState | null
    const shouldArm = Boolean(navState?.sessionArmed || navState?.autoStart)
    const bootKey = `${location.key}:${shouldArm}`
    if (listenBootKeyRef.current !== bootKey) {
      listenBootKeyRef.current = bootKey
      if (isListenSessionActive()) {
        attachToActiveSession()
      } else if (shouldArm) {
        beginListening()
      } else if (!bootedRef.current) {
        attachToActiveSession()
      }
      if (shouldArm) {
        window.history.replaceState(
          navState?.scenarioStart || navState?.storyStart != null
            ? { ...navState, sessionArmed: undefined, autoStart: undefined }
            : {},
          document.title,
        )
      }
    } else if (isListenSessionActive()) {
      attachToActiveSession()
    }
    bootedRef.current = true

    return () => {
      listenMountedRef.current = false
      detachUi()
      const ui = useUiStore.getState()
      const voiceBusy =
        ui.transcriptFinalizing ||
        ui.speechState === 'listening' ||
        ui.speechState === 'permission_pending' ||
        ui.speechState === 'processing'
      if (usesLocalSttRef.current && !voiceBusy && !isListenSessionActive()) {
        scheduleReleaseOfflineSttPipeline()
      }
      leaveCancelTimerRef.current = setTimeout(() => {
        leaveCancelTimerRef.current = null
        if (
          !listenMountedRef.current &&
          window.location.pathname !== '/listen' &&
          isListenSessionActive() &&
          !isVoiceSessionBusy()
        ) {
          cancelSession()
        }
      }, isMobileDevice() ? 800 : 280)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  const handleLeave = () => {
    cancelSession()
    navigate('/')
  }

  const handleOrbPress = () => {
    const recording =
      speechState === 'listening' ||
      (speechState === 'permission_pending' && isMicRecorderActive())

    if (recording) {
      finishRecording()
      return
    }

    if (speechState === 'permission_pending') {
      cancelSession()
      return
    }

    if (isFinalizing || isProcessing) {
      cancelSession()
      return
    }

    startMicCaptureFromGesture()
    if (canBeginOrb) {
      beginListening()
    }
  }

  const handleRetry = () => {
    clearError()
    cancelSession()
    beginListening()
  }

  const statusHint =
    showInterruptHint
      ? UI_LABELS.speakToInterrupt
      : isListening
      ? UI_LABELS.tapOrbToStop
      : isFinalizing
        ? {
            jp: `${UI_LABELS.statusFinalizing.jp} タップでキャンセル`,
            romaji: 'Mojiokoshi chuu… tap de kyanseru',
            en: 'Transcribing… tap orb to cancel',
          }
        : isProcessing
          ? {
              jp: `${UI_LABELS.processingSpeech.jp} タップでキャンセル`,
              romaji: 'Tap de kyanseru',
              en: 'Thinking… tap orb to cancel',
            }
          : isPreparing && usesLocalStt && !offlineSttReady
          ? {
              jp: '音声モデルを読み込み中…',
              romaji: 'Onsei moderu wo yomikomi chuu…',
              en: 'Loading speech model…',
            }
          : isPreparing
            ? {
                jp: 'マイク準備中…タップでキャンセル',
                romaji: 'Maiku junbi chuu… tap de kyanseru',
                en: 'Preparing microphone… tap orb to cancel',
              }
          : UI_LABELS.tapOrbToSpeak

  if (micBlocked) {
    return (
      <div className="presence-screen" data-testid="listen-page">
        <AppHeader compact onClose={handleLeave} onSettings={() => navigate('/settings')} />
        <main className="flex flex-1 items-center justify-center px-6">
          <MicPermissionBanner
            title={needsHttps ? micNeedsHttpsLabel() : undefined}
            showSecondary={!needsHttps}
            errorCode={needsHttps ? undefined : errorCode}
            onRetry={needsHttps ? undefined : handleRetry}
            onUseText={() => navigate('/chat')}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="presence-screen" data-testid="listen-page">
      <VoiceDebugOverlay />
      <OrbAmbienceBridge />
      <AppHeader compact onClose={handleLeave} onSettings={() => navigate('/settings')} />
      {showStoryToggle && (
        <StoryModeToggle
          onToggle={(enabled) => void setVoiceStoryMode(enabled)}
          disabled={isCapturing || isProcessing}
        />
      )}
      <PresenceStatusRow speechState={speechState} orbState={orbState} />

      {sessionError && (
        <div className="mx-4 mb-2 shrink-0">
          <MicPermissionBanner
            showSecondary
            errorCode={errorCode}
            onRetry={handleRetry}
            className="mx-auto w-full max-w-sm py-4"
          />
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col">
        <FloatingTurnBubbles
          messages={messages}
          onViewHistory={() => setHistoryOpen(true)}
        />

        <section
          className={`presence-stage${
            isFinalizing || isProcessing ? ' presence-dimmed' : ''
          }`}
        >
          <PresenceOrbShell
            speechState={speechState}
            orbState={orbState}
            busy={orbBusy}
            onClick={handleOrbPress}
            aria-label={
              isListening
                ? UI_LABELS.tapOrbToStop.en
                : isFinalizing
                  ? 'Cancel transcription'
                  : isProcessing
                    ? 'Cancel response processing'
                    : isPreparing
                      ? 'Cancel microphone setup'
                      : UI_LABELS.tapOrbToSpeak.en
            }
          >
            <NozomiOrb size={orbSize} showPlatform className="relative z-10 pointer-events-none" />
          </PresenceOrbShell>

          {isListening && (
            <WaveformStrip tall className="absolute bottom-0 mx-auto w-full max-w-xs px-4 opacity-80" />
          )}

          {listenPhase !== 'capturing' && (
            <div className="presence-hint mt-3 max-w-xs">
              <LanguageText text={statusHint} size="sm" align="center" passive />
            </div>
          )}

          <ListeningMicHint />
          <LiveTranscript />
        </section>

        {showReplyUi && (
          <PresenceSuggestions
            suggestions={voiceSuggestions}
            selectedKey={pinnedSuggestionKey}
            onSelect={(s) => {
              setVoicePinnedSuggestion(s)
              if (settings.suggestionVoiceEnabled) {
                stopSpeaking()
                speakJapanese(s.jp, {
                  rate: settings.voiceRate,
                  pitch: settings.voicePitch,
                  voiceUri: settings.voiceUri,
                })
              } else if (!dockBeginDisabled) {
                beginListening()
              }
            }}
          />
        )}
      </div>

      <PresenceDock
        left={{
          id: 'retry',
          label: UI_LABELS.continueTalking,
          icon: 'refresh',
          onClick: beginListening,
          disabled: dockBeginDisabled,
        }}
        center={{
          id: 'mic',
          label: UI_LABELS.speak,
          icon: 'mic',
          onClick: handleOrbPress,
          primary: true,
          disabled: !canBeginOrb && !isListening,
        }}
        right={{
          id: 'chat',
          label: UI_LABELS.openChat,
          icon: 'chat',
          onClick: () => navigate('/chat'),
        }}
      />

      <ChatHistorySheet
        open={historyOpen}
        messages={messages}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  )
}
