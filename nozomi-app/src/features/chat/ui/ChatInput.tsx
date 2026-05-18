import { useState } from 'react'
import { MicButton } from '@/features/voice/ui/MicButton'
import { MicPermissionBanner } from '@/features/voice/ui/MicPermissionBanner'
import { IconSend } from '@/components/ui/Icons'
import { UI_LABELS } from '@/data/ui-labels'
import { speechSupported } from '@/features/voice/logic/speechService'
import { BTN_ICON } from '@/utils/touch'

interface Props {
  onSend: (text: string) => void
}

export function ChatInput({ onSend }: Props) {
  const [value, setValue] = useState('')
  const [showMicHint, setShowMicHint] = useState(false)
  const sttOk = speechSupported().stt

  const submit = () => {
    const text = value.trim()
    if (!text) return
    onSend(text)
    setValue('')
  }

  return (
    <div className="safe-bottom border-t border-nozomi-border/25 bg-nozomi-bg/85 backdrop-blur-xl">
      {showMicHint && !sttOk && (
        <div className="px-3 pt-2">
          <MicPermissionBanner className="max-w-none w-full" showSecondary />
        </div>
      )}
      <form
        className="chat-compose"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <MicButton
          className="!h-11 !w-11 !border-0 !bg-transparent"
          onDenied={() => setShowMicHint(true)}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`${UI_LABELS.typeMessage.en} / ${UI_LABELS.typeMessage.jp}`}
          aria-label={`${UI_LABELS.typeMessage.en} / ${UI_LABELS.typeMessage.jp}`}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className={`${BTN_ICON} h-11 w-11 shrink-0 rounded-sm bg-nozomi-signal text-[#08080c] shadow-[0_3px_0_0_#9d0208] glow-purple-sm disabled:opacity-40`}
          aria-label={UI_LABELS.send.en}
        >
          <IconSend />
        </button>
      </form>
    </div>
  )
}