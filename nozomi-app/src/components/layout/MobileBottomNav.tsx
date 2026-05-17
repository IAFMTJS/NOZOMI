import { NavLink } from 'react-router-dom'
import {
  IconBook,
  IconChatBubble,
  IconHome,
  IconSliders,
} from '@/components/ui/Icons'
import { UI_LABELS } from '@/data/ui-labels'

const TABS = [
  { to: '/', label: UI_LABELS.appName, Icon: IconHome, end: true },
  { to: '/chat', label: UI_LABELS.chatNav, Icon: IconChatBubble, end: false },
  { to: '/word', label: UI_LABELS.words, Icon: IconBook, end: false },
  { to: '/settings', label: UI_LABELS.settings, Icon: IconSliders, end: false },
] as const

export function MobileBottomNav() {
  return (
    <nav
      className="mobile-bottom-nav safe-bottom lg:hidden"
      aria-label="Main"
    >
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `mobile-bottom-nav-item touch-manipulation ${isActive ? 'mobile-bottom-nav-item-active' : ''}`
          }
        >
          <Icon size={20} className="shrink-0" />
          <span className="mobile-bottom-nav-label">{label.en}</span>
        </NavLink>
      ))}
    </nav>
  )
}
