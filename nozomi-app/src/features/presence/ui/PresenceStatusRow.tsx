import {
  resolveSpeechRecognitionLang,
  speechLangDisplayName,
} from '@/features/voice/logic/speechLocale'
import { deriveListenPhase } from '@/features/voice/logic/listenPresence'
import type { VoicePipelineStep } from '@/features/voice/logic/voicePipelineStep'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'
import { UI_LABELS } from '@/data/ui-labels'
import type { LanguageText, OrbState, SpeechState } from '@/types/domain'

interface Props {
  speechState: SpeechState
  orbState: OrbState
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

function statusForPipelineStep(step: VoicePipelineStep): LanguageText | null {
  switch (step) {
    case 'preparing':
      return UI_LABELS.statusPreparing
    case 'listening':
    case 'recording':
      return UI_LABELS.listening
    case 'stopping-recorder':
    case 'transcribing':
      return UI_LABELS.statusFinalizing
    case 'understanding':
      return UI_LABELS.processingSpeech
    case 'generating':
      return {
        jp: '返事を考えています…',
        romaji: 'Henji wo kangaete imasu…',
        en: 'Generating response…',
      }
    case 'speaking':
      return UI_LABELS.statusSpeaking
    default:
      return null
  }
}

function statusForPhase(phase: ReturnType<typeof deriveListenPhase>): LanguageText | null {
  switch (phase) {
    case 'preparing':
      return UI_LABELS.statusPreparing
    case 'capturing':
      return UI_LABELS.listening
    case 'finalizing':
      return UI_LABELS.statusFinalizing
    case 'processing':
      return UI_LABELS.processingSpeech
    case 'speaking':
      return UI_LABELS.statusSpeaking
  }
  return null
}

export function PresenceStatusRow({ speechState, orbState }: Props) {
  const speechPref = useNozomiStore((s) => s.settings.speechInputLang)
  const transcriptFinalizing = useUiStore((s) => s.transcriptFinalizing)
  const pipelineStep = useUiStore((s) => s.voicePipelineStep)
  const phase = deriveListenPhase(speechState, orbState, transcriptFinalizing)
  const listeningAs = speechLangDisplayName(
    resolveSpeechRecognitionLang(speechPref),
  )
  const statusText =
    statusForPipelineStep(pipelineStep) ?? statusForPhase(phase)

  if (!statusText) {
    return <div className="min-h-[1.5rem] shrink-0" aria-hidden />
  }

  return (
    <div className="min-h-[1.5rem] shrink-0">
      <div
        className="presence-status"
        role="status"
        aria-live="polite"
        data-listen-phase={phase}
        data-voice-pipeline={pipelineStep}
        aria-label={`${statusText.jp}. ${statusText.en}`}
      >
        <MiniWave active={phase === 'capturing'} />
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
