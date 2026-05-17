import { TriLineLabel } from '@/components/language/TriLineLabel'
import {
  IconChatBubble,
  IconKeyboard,
  IconMic,
  IconRefresh,
  IconSuggestions,
} from '@/components/ui/Icons'
import type { LanguageText as LT } from '@/types/domain'

export interface DockAction {
  id: string
  label: LT
  icon: 'refresh' | 'mic' | 'chat' | 'keyboard' | 'suggestions'
  onClick: () => void
  primary?: boolean
  disabled?: boolean
}

interface Props {
  left: DockAction
  center: DockAction
  right: DockAction
}

function DockIcon({ type }: { type: DockAction['icon'] }) {
  switch (type) {
    case 'refresh':
      return <IconRefresh size={18} />
    case 'chat':
      return <IconChatBubble size={18} />
    case 'keyboard':
      return <IconKeyboard size={18} />
    case 'suggestions':
      return <IconSuggestions size={18} />
    case 'mic':
      return <IconMic size={28} />
    default:
      return <IconChatBubble size={18} />
  }
}

function SideAction({ action }: { action: DockAction }) {
  return (
    <button
      type="button"
      onClick={action.onClick}
      disabled={action.disabled}
      className="presence-dock-action touch-manipulation disabled:opacity-30"
    >
      <span className="presence-dock-icon">
        <DockIcon type={action.icon} />
      </span>
      <TriLineLabel text={action.label} />
    </button>
  )
}

export function PresenceDock({ left, center, right }: Props) {
  return (
    <div className="presence-dock-wrap">
      <div className="presence-dock">
        <SideAction action={left} />
        <button
          type="button"
          onClick={center.onClick}
          disabled={center.disabled}
          className="presence-dock-mic touch-manipulation disabled:opacity-40"
          aria-label={center.label.en}
        >
          <DockIcon type={center.icon} />
        </button>
        <SideAction action={right} />
      </div>
    </div>
  )
}
