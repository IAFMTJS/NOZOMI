import { useState } from 'react'
import { MicButton } from '@/components/audio/MicButton'
import { MicPermissionBanner } from '@/components/audio/MicPermissionBanner'
import { IconSend } from '@/components/ui/Icons'
import { UI_LABELS } from '@/data/ui-labels'
import { speechSupported } from '@/systems/speech/speechService'
import { BTN_ICON } from '@/utils/touch'

interface Props {
  onSend: (text: string) => void
}

export function ChatInput({ onSend }: Props) {
  const [value, setValue] = useState('')
  const [showMicHint, setShowMicHint] = useState(false)
  const sttOk = speechSupported().stt

  const submit = () => {
    if (!value.trim()) return
    onSend(value)
    setValue('')
  }

  return (
    <div className="safe-bottom border-t border-nozomi-border/20 bg-nozomi-bg/90 backdrop-blur-xl">
      {showMicHint && !sttOk && (
        <div className="px-3 pt-2">
          <MicPermissionBanner className="max-w-none w-full" showSecondary />
        </div>
      )}
      <div className="chat-compose">
        <MicButton
          className="!h-11 !w-11 !border-0 !bg-transparent"
          onDenied={() => setShowMicHint(true)}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={`${UI_LABELS.typeMessage.en} / ${UI_LABELS.typeMessage.jp}`}
          aria-label={UI_LABELS.typeMessage.en}
        />
        <button
          type="button"
          onClick={submit}
          className={`${BTN_ICON} h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-nozomi-purple to-nozomi-indigo text-white glow-purple-sm`}
          aria-label={UI_LABELS.send.en}
        >
          <IconSend />
        </button>
      </div>
    </div>
  )
}
