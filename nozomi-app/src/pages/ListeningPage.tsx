import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/ui/AppHeader'
import { ListeningMicHint } from '@/components/audio/ListeningMicHint'
import { SpeechLangQuickPick } from '@/components/audio/SpeechLangQuickPick'
import { ListeningStatus } from '@/components/audio/ListeningStatus'
import { LiveTranscript } from '@/components/audio/LiveTranscript'
import { MicPermissionBanner } from '@/components/audio/MicPermissionBanner'
import { VoiceTurnPanel } from '@/components/audio/VoiceTurnPanel'
import { SuggestionPills } from '@/components/suggestions/SuggestionPills'
import { useConversation } from '@/hooks/useConversation'
import { WaveformStrip } from '@/components/audio/WaveformStrip'
import { LanguageText } from '@/components/language/LanguageText'
import { NozomiOrb } from '@/components/orb/NozomiOrb'
import { IconStop } from '@/components/ui/Icons'
import { UI_LABELS } from '@/data/ui-labels'
import { useSpeechListen } from '@/contexts/SpeechListenContext'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useOrbSize } from '@/hooks/useVisualViewportHeight'
import type { LanguageText as LT } from '@/types/domain'
import {
  isListenSessionActive,
  micNeedsSecureContext,
  speechSupported,
} from '@/systems/speech/speechService'
import { BTN_ROW_SM, BTN_TOUCH } from '@/utils/touch'
import { micNeedsHttpsLabel } from '@/utils/devConnect'

type ListenLocationState = { autoStart?: boolean }

export function ListeningPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const speechState = useNozomiStore((s) => s.speechState)
  const messages = useNozomiStore((s) => s.voiceMessages)
  const voiceSuggestions = useNozomiStore((s) => s.voiceSuggestions)
  const { sendUserMessage } = useConversation()
  const {
    beginListening,
    finishRecording,
    cancelSession,
    attachToActiveSession,
    detachUi,
    errorCode,
    clearError,
  } = useSpeechListen()
  const needsHttps = micNeedsSecureContext()
  const micBlocked =
    needsHttps || !speechSupported().stt || speechState === 'error'
  const isListening = speechState === 'listening'
  const isPreparing = speechState === 'permission_pending'
  const isCapturing = isListening || isPreparing
  const isProcessing = speechState === 'processing'
  const hasTurn = messages.length > 0
  const orbPreferred = hasTurn && !isCapturing ? 220 : 280
  const orbReserved = hasTurn && !isCapturing ? 400 : 380
  const showReplyUi = hasTurn && !isCapturing && !isProcessing
  const orbSize = useOrbSize(orbPreferred, orbReserved)

  const bootedRef = useRef(false)
  const autoStartedRef = useRef(false)

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
    if (!isCapturing && !isProcessing) {
      beginListening()
    }
  }

  const handleRetry = () => {
    cancelSession()
    beginListening()
  }

  const statusText: LT =
    isListening
      ? UI_LABELS.tapOrbToStop
      : isProcessing
        ? UI_LABELS.processingSpeech
        : isPreparing
          ? {
              jp: 'マイク準備中…',
              romaji: 'Maiku junbi chuu…',
              en: 'Preparing microphone…',
            }
          : UI_LABELS.tapOrbToSpeak

  return (
    <div className="app-page">
      <AppHeader onClose={handleLeave} onSettings={() => navigate('/settings')} />
      <main className="app-page-scroll relative flex flex-col items-center gap-3 px-6 pt-4 pb-4">
        {micBlocked ? (
          <MicPermissionBanner
            title={needsHttps ? micNeedsHttpsLabel() : undefined}
            showSecondary={!needsHttps}
            errorCode={needsHttps ? undefined : errorCode}
            onRetry={needsHttps ? undefined : handleRetry}
            onUseText={() => navigate('/chat')}
          />
        ) : (
          <>
            <ListeningStatus state={speechState} />
            {!isCapturing && !isProcessing && (
              <SpeechLangQuickPick />
            )}
            <ListeningMicHint />
            <LiveTranscript speechState={speechState} />
            {hasTurn && !isCapturing && <VoiceTurnPanel />}
            <div className="orb-stage flex flex-col items-center justify-center w-full max-w-md shrink-0">
              <button
                type="button"
                onClick={handleOrbPress}
                disabled={isPreparing || isProcessing}
                className={`${BTN_TOUCH} touch-target rounded-full disabled:cursor-not-allowed`}
                aria-label={
                  isListening
                    ? UI_LABELS.tapOrbToStop.en
                    : UI_LABELS.tapOrbToSpeak.en
                }
              >
                <NozomiOrb size={orbSize} showPlatform className="pointer-events-none" />
              </button>
            </div>
            {isListening && (
              <WaveformStrip tall className="mx-auto w-full max-w-lg px-2" />
            )}
            {showReplyUi && voiceSuggestions.length > 0 && (
              <SuggestionPills
                compact
                suggestions={voiceSuggestions}
                onSelect={(s) => void sendUserMessage(s.jp, 'voice')}
              />
            )}
          </>
        )}
      </main>
      {!micBlocked && (
        <div className="flex shrink-0 flex-col items-center gap-2 px-6 pt-1 pb-6 safe-bottom">
          {isListening && (
            <button
              type="button"
              onClick={finishRecording}
              className={`${BTN_TOUCH} touch-target flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border-2 border-nozomi-purple/60 bg-nozomi-surface/80 text-nozomi-text glow-purple`}
              aria-label={UI_LABELS.doneSpeaking.en}
            >
              <IconStop size={26} />
            </button>
          )}
          <LanguageText text={statusText} size="sm" align="center" />
          {!isCapturing && !isProcessing && (
            <div className="flex w-full max-w-xs gap-2">
              <button
                type="button"
                onClick={beginListening}
                className={`${BTN_ROW_SM} flex-1 border border-nozomi-purple/50`}
              >
                <LanguageText
                  text={UI_LABELS.continueTalking}
                  size="sm"
                  align="center"
                  passive
                />
              </button>
              {hasTurn && (
                <button
                  type="button"
                  onClick={() => navigate('/chat')}
                  className={`${BTN_ROW_SM} flex-1 bg-nozomi-purple`}
                >
                  <LanguageText
                    text={UI_LABELS.openChat}
                    size="sm"
                    align="center"
                    passive
                  />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
