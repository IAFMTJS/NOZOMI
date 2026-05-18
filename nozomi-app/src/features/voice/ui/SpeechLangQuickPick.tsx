import { SPEECH_LANG_OPTIONS } from '@/data/speech-lang-options'
import { useNozomiStore } from '@/store/useNozomiStore'
import {
  resolveSpeechRecognitionLang,
  speechLangDisplayName,
} from '@/features/voice/logic/speechLocale'
import { BTN_TOUCH } from '@/utils/touch'

interface Props {
  disabled?: boolean
}

/** Pick STT language before speaking — Web Speech API uses one locale per session. */
export function SpeechLangQuickPick({ disabled }: Props) {
  const speechInputLang = useNozomiStore((s) => s.settings.speechInputLang)
  const setSettings = useNozomiStore((s) => s.setSettings)
  const hearing = speechLangDisplayName(
    resolveSpeechRecognitionLang(speechInputLang),
  )

  return (
    <div className="w-full max-w-xs shrink-0 space-y-1" data-testid="speech-lang-quick-pick">
      <p className="text-center text-[10px] leading-tight text-nozomi-muted">
        {hearing}
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {SPEECH_LANG_OPTIONS.map(({ key, label, short }) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            title={label.en}
            onClick={() => setSettings({ speechInputLang: key })}
            className={`${BTN_TOUCH} min-h-[30px] rounded-lg border px-1 py-1 text-center text-[11px] font-medium leading-tight transition disabled:opacity-50 ${
              speechInputLang === key
                ? 'border-nozomi-purple bg-nozomi-purple/25 text-nozomi-text ring-1 ring-nozomi-purple/40'
                : 'border-nozomi-purple/25 bg-nozomi-surface/40 text-nozomi-muted'
            }`}
          >
            {short}
          </button>
        ))}
      </div>
    </div>
  )
}
