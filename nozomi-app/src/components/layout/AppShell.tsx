import { NavLink, useLocation } from 'react-router-dom'
import { LanguageText } from '@/components/language/LanguageText'
import { DesktopContextPanel } from '@/components/layout/DesktopContextPanel'
import { FuturisticBackdrop } from '@/components/layout/FuturisticBackdrop'
import { UI_LABELS } from '@/data/ui-labels'

const NAV = [
  { to: '/', label: UI_LABELS.appName, icon: '✦' },
  { to: '/chat', label: UI_LABELS.speak, icon: '💬' },
  { to: '/word', label: UI_LABELS.words, icon: '📖' },
  { to: '/settings', label: UI_LABELS.settings, icon: '⚙' },
] as const

const FULL_BLEED = new Set(['/listen'])

interface Props {
  children: React.ReactNode
}

export function AppShell({ children }: Props) {
  const { pathname } = useLocation()
  const showContextRail = pathname === '/chat' || pathname === '/'
  const fullBleed = FULL_BLEED.has(pathname)

  return (
    <div className={`relative h-full min-h-0 overflow-hidden ${fullBleed ? '' : 'lg:flex'}`}>
      <FuturisticBackdrop />
      <div className={`relative z-10 ${fullBleed ? 'h-full' : 'flex h-full min-w-0 flex-1 lg:flex'}`}>
        {!fullBleed && (
          <aside className="hidden lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-nozomi-border/30 lg:bg-nozomi-surface/40 lg:px-3 lg:py-6">
            <p className="font-display mb-6 px-3 text-xs font-semibold tracking-[0.3em] text-nozomi-cyan">
              NOZOMI
            </p>
            <nav className="flex flex-col gap-1" aria-label="Main">
              {NAV.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                      isActive
                        ? 'border border-nozomi-purple/40 bg-purple-950/50 text-nozomi-text glow-ring'
                        : 'text-nozomi-muted hover:bg-nozomi-surface/60 hover:text-nozomi-text'
                    }`
                  }
                >
                  <span className="text-lg" aria-hidden>
                    {icon}
                  </span>
                  <LanguageText text={label} size="sm" />
                </NavLink>
              ))}
            </nav>
          </aside>
        )}
        <div className={`flex h-full min-h-0 min-w-0 flex-1 overflow-hidden ${fullBleed ? '' : 'lg:max-h-dvh'}`}>
          <div
            className={`mx-auto flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden ${
              !fullBleed && showContextRail
                ? 'xl:max-w-2xl'
                : !fullBleed
                  ? 'lg:max-w-3xl xl:max-w-4xl'
                  : ''
            }`}
          >
            {children}
          </div>
          {!fullBleed && showContextRail && <DesktopContextPanel />}
        </div>
      </div>
    </div>
  )
}
