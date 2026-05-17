import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/ui/AppHeader'
import { ListeningMicHint } from '@/components/audio/ListeningMicHint'
import { LiveTranscript } from '@/components/audio/LiveTranscript'
import { MicPermissionBanner } from '@/components/audio/MicPermissionBanner'
import { NozomiOrb } from '@/components/orb/NozomiOrb'
import { ChatHistorySheet } from '@/components/presence/ChatHistorySheet'
import { FloatingTurnBubbles } from '@/components/presence/FloatingTurnBubbles'
import { PresenceDock } from '@/components/presence/PresenceDock'
import { PresenceStatusRow } from '@/components/presence/PresenceStatusRow'
import { StoryModeToggle } from '@/components/presence/StoryModeToggle'
import { PresenceSuggestions } from '@/components/presence/PresenceSuggestions'
import { LanguageText } from '@/components/language/LanguageText'
import { suggestionKey } from '@/components/suggestions/SuggestionPills'
import { useConversation } from '@/hooks/useConversation'
import { speakJapanese, stopSpeaking } from '@/systems/speech/speechService'
import { WaveformStrip } from '@/components/audio/WaveformStrip'
import { UI_LABELS } from '@/data/ui-labels'
import { useSpeechListen } from '@/contexts/SpeechListenContext'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useOrbSize } from '@/hooks/useVisualViewportHeight'
import {
  isListenSessionActive,
  micNeedsSecureContext,
  speechSupported,
} from '@/systems/speech/speechService'
import { micNeedsHttpsLabel } from '@/utils/devConnect'

import type { ScenarioCategory } from '@/types/domain'

type ListenLocationState = { autoStart?: boolean; scenarioStart?: ScenarioCategory }

export function ListeningPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const speechState = useNozomiStore((s) => s.speechState)
  const orbState = useNozomiStore((s) => s.orbState)
  const dataReady = useNozomiStore((s) => s.dataReady)
  const messages = useNozomiStore((s) => s.voiceMessages)
  const voiceSuggestions = useNozomiStore((s) => s.voiceSuggestions)
  const voicePinnedSuggestion = useNozomiStore((s) => s.voicePinnedSuggestion)
  const setVoicePinnedSuggestion = useNozomiStore((s) => s.setVoicePinnedSuggestion)
  const settings = useNozomiStore((s) => s.settings)
  const { startVoiceConversation, startScenarioConversation, setVoiceStoryMode } =
    useConversation()
  const voiceTurnCount = useNozomiStore((s) => s.voiceSession.turnCount)
  const voiceStoryMode = useNozomiStore((s) => s.settings.voiceStoryMode)
  const showStoryToggle = voiceTurnCount >= 5 || voiceStoryMode
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

  const needsHttps = micNeedsSecureContext()
  const micBlocked =
    needsHttps || !speechSupported().stt || speechState === 'error'
  const isListening = speechState === 'listening'
  const isPreparing = speechState === 'permission_pending'
  const isCapturing = isListening || isPreparing
  const isProcessing = speechState === 'processing'
  const isSpeaking = orbState === 'speaking'
  const micDisabled = isCapturing || isProcessing || isSpeaking
  const hasTurn = messages.length > 0
  const showReplyUi =
    hasTurn &&
    !isProcessing &&
    voiceSuggestions.length > 0 &&
    (!isCapturing || voicePinnedSuggestion != null)

  const orbPreferred = 340
  const orbReserved = 260
  const orbSize = useOrbSize(orbPreferred, orbReserved)

  const bootedRef = useRef(false)
  const autoStartedRef = useRef(false)
  const voiceOpenedRef = useRef(false)

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
    if (navState?.scenarioStart) {
      voiceOpenedRef.current = true
      void startScenarioConversation(navState.scenarioStart, 'voice')
      window.history.replaceState(
        navState.autoStart ? { autoStart: true } : {},
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
    startVoiceConversation,
  ])

  useEffect(() => {
    clearError()
    const autoStart = (location.state as ListenLocationState | null)?.autoStart
    if (isListenSessionActive()) {
      attachToActiveSession()
    } else if (autoStart && !autoStartedRef.current) {
      autoStartedRef.current = true
      beginListening()
      window.history.replaceState({}, document.title)
    } else if (!bootedRef.current && attachToActiveSession()) {
      /* resume existing session only */
    }
    bootedRef.current = true

    return () => {
      detachUi()
      window.setTimeout(() => {
        if (window.location.pathname !== '/listen' && isListenSessionActive()) {
          cancelSession()
        }
      }, 80)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLeave = () => {
    cancelSession()
    navigate('/')
  }

  const handleOrbPress = () => {
    if (isListening) {
      finishRecording()
      return
    }
    if (!micDisabled) {
      beginListening()
    }
  }

  const handleRetry = () => {
    cancelSession()
    beginListening()
  }

  const statusHint =
    isListening
      ? UI_LABELS.tapOrbToStop
      : isProcessing
        ? UI_LABELS.processingSpeech
        : isPreparing && !offlineSttReady
          ? {
              jp: '音声モデルを読み込み中…（初回は1分ほど）',
              romaji: 'Onsei moderu wo yomikomi chuu…',
              en: 'Loading speech model… (first time may take ~1 min)',
            }
          : isPreparing
            ? {
                jp: 'マイク準備中…',
                romaji: 'Maiku junbi chuu…',
                en: 'Preparing microphone…',
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
      <AppHeader compact onClose={handleLeave} onSettings={() => navigate('/settings')} />
      {showStoryToggle && (
        <StoryModeToggle
          onToggle={(enabled) => void setVoiceStoryMode(enabled)}
          disabled={isCapturing || isProcessing}
        />
      )}
      <PresenceStatusRow speechState={speechState} orbState={orbState} />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <FloatingTurnBubbles
          messages={messages}
          onViewHistory={() => setHistoryOpen(true)}
        />

        <section
          className={`presence-stage ${orbState === 'thinking' ? 'presence-dimmed' : ''}`}
        >
          <button
            type="button"
            onClick={handleOrbPress}
            disabled={micDisabled}
            className="presence-orb-anchor touch-target touch-manipulation disabled:cursor-not-allowed"
            aria-label={
              isListening
                ? UI_LABELS.tapOrbToStop.en
                : UI_LABELS.tapOrbToSpeak.en
            }
          >
            <span className="presence-orb-glow" aria-hidden />
            <span className="presence-orb-ring" aria-hidden />
            <NozomiOrb size={orbSize} showPlatform className="relative z-10 pointer-events-none" />
          </button>

          {isListening && (
            <WaveformStrip tall className="absolute bottom-0 mx-auto w-full max-w-xs px-4 opacity-80" />
          )}

          {!isCapturing && !isProcessing && (
            <div className="presence-hint mt-3 max-w-xs">
              <LanguageText text={statusHint} size="sm" align="center" passive />
            </div>
          )}

          <ListeningMicHint />
          <LiveTranscript speechState={speechState} />
        </section>

        {showReplyUi && (
          <PresenceSuggestions
            suggestions={voiceSuggestions}
            selectedKey={pinnedSuggestionKey}
            onSelect={(s) => {
              const idx = voiceSuggestions.findIndex(
                (x, i) => suggestionKey(x, i) === suggestionKey(s, i),
              )
              setVoicePinnedSuggestion(s)
              if (settings.suggestionVoiceEnabled) {
                stopSpeaking()
                speakJapanese(s.jp, {
                  rate: settings.voiceRate,
                  pitch: settings.voicePitch,
                })
              } else if (!micDisabled) {
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
          disabled: micDisabled,
        }}
        center={{
          id: 'mic',
          label: UI_LABELS.speak,
          icon: 'mic',
          onClick: handleOrbPress,
          primary: true,
          disabled: micDisabled,
        }}
        right={{
          id: 'chat',
          label: hasTurn ? UI_LABELS.openChat : UI_LABELS.openChat,
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
