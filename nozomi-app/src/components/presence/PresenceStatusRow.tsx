import {
  resolveSpeechRecognitionLang,
  speechLangDisplayName,
} from '@/systems/speech/speechLocale'
import { useNozomiStore } from '@/store/useNozomiStore'
import { UI_LABELS } from '@/data/ui-labels'
import type { LanguageText, OrbState, SpeechState } from '@/types/domain'

interface Props {
  speechState: SpeechState
  orbState: OrbState
}

const STATUS_BY_SPEECH: Partial<
  Record<Exclude<SpeechState, 'idle' | 'error'>, LanguageText>
> = {
  permission_pending: UI_LABELS.statusPreparing,
  listening: UI_LABELS.listening,
  processing: UI_LABELS.processingSpeech,
  speaking: UI_LABELS.statusSpeaking,
}

function MiniWave({ active }: { active: boolean }) {
  if (!active) {
    return (
      <span className="presence-status-wave opacity-40" aria-hidden>
        <span style={{ height: 4 }} />
        <span style={{ height: 6 }} />
        <span style={{ height: 4 }} />
        <span style={{ height: 5 }} />
      </span>
    )
  }
  return (
    <span className="presence-status-wave" aria-hidden>
      <span />
      <span />
      <span />
      <span />
    </span>
  )
}

export function PresenceStatusRow({ speechState, orbState }: Props) {
  const speechPref = useNozomiStore((s) => s.settings.speechInputLang)
  const listeningAs = speechLangDisplayName(
    resolveSpeechRecognitionLang(speechPref),
  )

  const showListening = speechState === 'listening'
  const showProcessing = speechState === 'processing'
  const showSpeaking =
    speechState === 'speaking' || orbState === 'speaking'
  const showPreparing = speechState === 'permission_pending'

  const statusText =
    showListening
      ? STATUS_BY_SPEECH.listening
      : showProcessing
        ? STATUS_BY_SPEECH.processing
        : showSpeaking
          ? STATUS_BY_SPEECH.speaking
          : showPreparing
            ? STATUS_BY_SPEECH.permission_pending
            : null

  if (!statusText) {
    return <div className="min-h-[1.5rem] shrink-0" aria-hidden />
  }

  return (
    <div className="min-h-[1.5rem] shrink-0">
      <div
        className="presence-status"
        role="status"
        aria-live="polite"
        aria-label={`${statusText.jp}. ${statusText.en}`}
      >
        <MiniWave active={showListening} />
        <span className="msg-jp text-sm">{statusText.jp}</span>
        <span className="hidden text-xs text-nozomi-muted sm:inline">
          {statusText.en}
        </span>
        <span className="opacity-50">·</span>
        <span className="text-xs opacity-70">{listeningAs}</span>
      </div>
    </div>
  )
}
