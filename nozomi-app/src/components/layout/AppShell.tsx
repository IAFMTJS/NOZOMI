import { NavLink, useLocation } from 'react-router-dom'
import { LanguageText } from '@/components/language/LanguageText'
import { DesktopContextPanel } from '@/components/layout/DesktopContextPanel'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { FuturisticBackdrop } from '@/components/layout/FuturisticBackdrop'
import {
  IconBook,
  IconChatBubble,
  IconHome,
  IconSliders,
} from '@/components/ui/Icons'
import { UI_LABELS } from '@/data/ui-labels'

const NAV = [
  { to: '/', label: UI_LABELS.appName, Icon: IconHome },
  { to: '/chat', label: UI_LABELS.chatNav, Icon: IconChatBubble },
  { to: '/word', label: UI_LABELS.words, Icon: IconBook },
  { to: '/settings', label: UI_LABELS.settings, Icon: IconSliders },
] as const

const FULL_BLEED = new Set(['/listen', '/onboarding'])
const HIDE_MOBILE_NAV = new Set(['/listen', '/onboarding'])

interface Props {
  children: React.ReactNode
}

export function AppShell({ children }: Props) {
  const { pathname } = useLocation()
  const showContextRail = pathname === '/chat' || pathname === '/'
  const fullBleed = FULL_BLEED.has(pathname)
  const showMobileNav = !HIDE_MOBILE_NAV.has(pathname)

  return (
    <div className={`relative h-full min-h-0 overflow-hidden ${fullBleed ? '' : 'lg:flex'}`}>
      <FuturisticBackdrop />
      <div
        className={`relative z-10 flex h-full min-h-0 flex-col ${fullBleed ? '' : 'lg:flex-1 lg:flex-row'}`}
      >
        {!fullBleed && (
          <aside className="hidden lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-nozomi-border/30 lg:bg-nozomi-surface/40 lg:px-3 lg:py-6">
            <p className="mb-6 px-3 text-xs font-semibold tracking-[0.2em] text-nozomi-accent">
              NOZOMI
            </p>
            <nav className="flex flex-col gap-1" aria-label="Main">
              {NAV.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                      isActive
                        ? 'border border-nozomi-accent/40 bg-nozomi-bg-elevated text-nozomi-text'
                        : 'text-nozomi-muted hover:bg-nozomi-surface/60 hover:text-nozomi-text'
                    }`
                  }
                >
                  <Icon size={18} className="shrink-0 opacity-90" />
                  <LanguageText text={label} size="sm" />
                </NavLink>
              ))}
            </nav>
          </aside>
        )}
        <div className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${fullBleed ? 'h-full flex-col' : 'lg:max-h-dvh lg:flex-row'}`}>
          <div
            className={`mx-auto flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden ${
              !fullBleed && showContextRail
                ? 'lg:max-w-2xl xl:max-w-2xl'
                : !fullBleed
                  ? 'lg:max-w-3xl xl:max-w-4xl'
                  : ''
            } ${showMobileNav ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0' : ''}`}
          >
            {children}
          </div>
          {!fullBleed && showContextRail && <DesktopContextPanel />}
        </div>
        {showMobileNav && <MobileBottomNav />}
      </div>
    </div>
  )
}
