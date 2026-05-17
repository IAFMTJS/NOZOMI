import { UI_LABELS } from '@/data/ui-labels'
import type { LanguageText as LT, SpeechInputLang } from '@/types/domain'

export const SPEECH_LANG_OPTIONS: {
  key: SpeechInputLang
  label: LT
  short: string
}[] = [
  { key: 'auto', label: UI_LABELS.speechLangAuto, short: 'Auto' },
  { key: 'ja-JP', label: UI_LABELS.speechLangJa, short: 'JP' },
  { key: 'en-US', label: UI_LABELS.speechLangEn, short: 'EN' },
  { key: 'nl-NL', label: UI_LABELS.speechLangNl, short: 'NL' },
]
