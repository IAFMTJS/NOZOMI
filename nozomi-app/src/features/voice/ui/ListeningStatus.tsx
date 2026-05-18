import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import {
  resolveSpeechRecognitionLang,
  speechLangDisplayName,
} from '@/features/voice/logic/speechLocale'
import { useNozomiStore } from '@/store/useNozomiStore'
import type { SpeechState } from '@/types/domain'

interface Props {
  state: SpeechState
}

export function ListeningStatus({ state }: Props) {
  const speechPref = useNozomiStore((s) => s.settings.speechInputLang)
  const listeningAs = speechLangDisplayName(
    resolveSpeechRecognitionLang(speechPref),
  )
  if (state === 'permission_pending') {
    return (
      <LanguageText
        text={{
          jp: 'マイクを確認中…',
          romaji: 'Maiku wo kakunin chuu…',
          en: 'Checking microphone…',
        }}
        size="sm"
        align="center"
      />
    )
  }
  if (state === 'processing') {
    return (
      <LanguageText
        text={{
          jp: '処理中…',
          romaji: 'Shori chuu…',
          en: 'Processing…',
        }}
        size="sm"
        align="center"
      />
    )
  }
  if (state === 'listening') {
    return (
      <div className="space-y-1 text-center">
        <LanguageText text={UI_LABELS.listening} size="lg" align="center" />
        <p className="text-xs text-nozomi-muted">Hearing: {listeningAs}</p>
      </div>
    )
  }
  return null
}
