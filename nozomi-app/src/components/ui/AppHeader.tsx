import { Link } from 'react-router-dom'
import { IconBack, IconClose, IconMenu, IconSliders } from '@/components/ui/Icons'

interface Props {
  showBack?: boolean
  title?: string
  titleKey?: 'appName' | 'words' | 'settings'
  onSettings?: () => void
  hideSettings?: boolean
  onClose?: () => void
  /** Minimal fixed header for presence layout */
  compact?: boolean
}

const TITLE_MAP = {
  appName: 'NOZOMI',
  words: 'WORDS',
  settings: 'SETTINGS',
} as const

export function AppHeader({
  showBack,
  title,
  titleKey = 'appName',
  onSettings,
  onClose,
  hideSettings,
  compact = false,
}: Props) {
  const displayTitle = title ?? TITLE_MAP[titleKey] ?? 'NOZOMI'

  return (
    <header className={compact ? 'presence-header' : 'safe-top px-4 py-3'}>
      <div className="flex items-center justify-between">
        <div className={`flex items-center justify-start ${compact ? 'w-9' : 'w-10'}`}>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="app-header-btn"
              aria-label="Close"
            >
              <IconClose size={22} />
            </button>
          ) : showBack ? (
            <Link to="/" className="app-header-btn" aria-label="Back">
              <IconBack />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onSettings}
              className="app-header-btn"
              aria-label="Settings"
            >
              <IconMenu />
            </button>
          )}
        </div>

        <h1
          className={`font-display font-bold tracking-[0.35em] text-holo ${
            compact ? 'text-[0.65rem] opacity-90' : 'text-xs sm:text-sm'
          }`}
        >
          {displayTitle}
        </h1>

        {hideSettings ? (
          <div className={compact ? 'w-9' : 'w-10'} aria-hidden />
        ) : (
          <button
            type="button"
            onClick={onSettings}
            className="app-header-btn app-header-btn-accent"
            aria-label="Settings"
          >
            <IconSliders />
          </button>
        )}
      </div>
    </header>
  )
}
