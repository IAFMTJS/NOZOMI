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
  switch (code) {
    case 'network':
      return UI_LABELS.micNetwork
    case 'start-failed':
      return UI_LABELS.micModelFailed
    case 'busy':
      return UI_LABELS.micBusy
    case 'no-device':
      return UI_LABELS.micNoDevice
    case 'not-supported':
    case 'unknown':
      return UI_LABELS.micStartFailed
    default:
      return UI_LABELS.micDeniedEn
  }
}

function titleForError(code?: SpeechErrorCode): LT | undefined {
  switch (code) {
    case 'start-failed':
      return {
        jp: '音声モデルを読み込めません',
        romaji: 'Onsei moderu wo yomikomi masen',
        en: 'Speech model could not load',
      }
    case 'busy':
      return {
        jp: 'マイクが使用中です',
        romaji: 'Maiku ga shiyouchuu desu',
        en: 'Microphone is busy',
      }
    case 'no-device':
      return {
        jp: 'マイクが見つかりません',
        romaji: 'Maiku ga mitsukarimasen',
        en: 'No microphone found',
      }
  }
  return undefined
}

export function MicPermissionBanner({
  title,
  detail,
  showSecondary = true,
  onUseText,
  onRetry,
  errorCode,
  className = '',
}: Props) {
  const resolvedTitle = title ?? titleForError(errorCode) ?? UI_LABELS.micDenied
  const secondary = detail ?? detailForError(errorCode)

  return (
    <div
      className={`glass-panel max-w-sm space-y-3 p-6 text-center ${className}`}
      role="alert"
    >
      <LanguageText text={resolvedTitle} size="md" align="center" />
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
