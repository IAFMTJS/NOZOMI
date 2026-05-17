import {
  resolveSpeechRecognitionLang,
  speechLangDisplayName,
} from '@/systems/speech/speechLocale'
import { useNozomiStore } from '@/store/useNozomiStore'
import type { OrbState, SpeechState } from '@/types/domain'

interface Props {
  speechState: SpeechState
  orbState: OrbState
}

const STATUS_COPY: Record<
  Exclude<SpeechState, 'idle' | 'error'>,
  string
> = {
  permission_pending: 'Preparing…',
  listening: 'Listening…',
  processing: 'Processing…',
  speaking: 'Speaking…',
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
  const showSpeaking = speechState === 'speaking' || orbState === 'speaking'
  const showPreparing = speechState === 'permission_pending'

  const label = showListening
    ? STATUS_COPY.listening
    : showProcessing
      ? STATUS_COPY.processing
      : showSpeaking
        ? STATUS_COPY.speaking
        : showPreparing
          ? STATUS_COPY.permission_pending
          : null

  if (!label) {
    return <div className="min-h-[1.5rem] shrink-0" aria-hidden />
  }

  return (
    <div className="min-h-[1.5rem] shrink-0">
      <div className="presence-status" role="status" aria-live="polite">
        <MiniWave active={showListening} />
        <span>{label}</span>
        <span className="opacity-50">·</span>
        <span className="opacity-70">{listeningAs}</span>
      </div>
    </div>
  )
}
