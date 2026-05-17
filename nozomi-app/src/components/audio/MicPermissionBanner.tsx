import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import type { LanguageText as LT } from '@/types/domain'
import type { SpeechErrorCode } from '@/systems/speech/speechService'
import { BTN_ROW } from '@/utils/touch'

interface Props {
  title?: LT
  detail?: LT
  showSecondary?: boolean
  onUseText?: () => void
  onRetry?: () => void
  errorCode?: SpeechErrorCode
  className?: string
}

function detailForError(code?: SpeechErrorCode): LT {
  if (code === 'network') return UI_LABELS.micNetwork
  return UI_LABELS.micDeniedEn
}

export function MicPermissionBanner({
  title = UI_LABELS.micDenied,
  detail,
  showSecondary = true,
  onUseText,
  onRetry,
  errorCode,
  className = '',
}: Props) {
  const secondary = detail ?? detailForError(errorCode)

  return (
    <div
      className={`glass-panel max-w-sm space-y-3 p-6 text-center ${className}`}
      role="alert"
    >
      <LanguageText text={title} size="md" align="center" />
      {showSecondary && (
        <LanguageText text={secondary} size="sm" align="center" />
      )}
      {onRetry && (
        <button type="button" onClick={onRetry} className={BTN_ROW}>
          <LanguageText text={UI_LABELS.micRetry} size="sm" align="center" passive />
        </button>
      )}
      {onUseText && (
        <button type="button" onClick={onUseText} className={`${BTN_ROW} bg-nozomi-purple`}>
          <LanguageText text={UI_LABELS.type} size="sm" align="center" passive />
        </button>
      )}
    </div>
  )
}
