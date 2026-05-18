import { IconMic } from '@/components/ui/Icons'
import { UI_LABELS } from '@/data/ui-labels'
import { BTN_ICON } from '@/utils/touch'
import { useSpeechListen } from '@/features/voice/context/SpeechListenContext'
import { speechSupported, startMicCaptureFromGesture } from '@/features/voice/logic/speechService'
import { micNeedsHttpsLabel } from '@/utils/devConnect'

interface Props {
  size?: 'md' | 'lg'
  className?: string
  onDenied?: () => void
}

export function MicButton({ size = 'md', className = '', onDenied }: Props) {
  const { armAndGoToListen } = useSpeechListen()
  const { stt, needsHttps } = speechSupported()

  const handleClick = () => {
    if (!stt) {
      onDenied?.()
      return
    }
    startMicCaptureFromGesture()
    void armAndGoToListen()
  }

  const isLg = size === 'lg'

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${BTN_ICON} shrink-0 rounded-full border border-nozomi-border/50 text-nozomi-purple hover:border-nozomi-purple/70 hover:bg-purple-950/30 disabled:cursor-not-allowed disabled:opacity-40 ${
        isLg ? 'h-14 w-14' : 'h-11 w-11'
      } ${className}`}
      disabled={!stt}
      aria-label={UI_LABELS.speak.en}
      title={
        needsHttps
          ? micNeedsHttpsLabel().en
          : stt
            ? UI_LABELS.speak.en
            : UI_LABELS.micDenied.en
      }
    >
      <IconMic size={isLg ? 26 : 20} />
    </button>
  )
}
