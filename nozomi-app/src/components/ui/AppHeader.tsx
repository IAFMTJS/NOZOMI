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
    <header
      className={`flex items-center justify-between ${
        compact ? 'presence-header px-4 py-2' : 'px-4 py-3 safe-top'
      }`}
    >
      <div className={`flex items-center justify-start ${compact ? 'w-9' : 'w-10'}`}>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className={`touch-target flex items-center justify-center rounded-xl text-nozomi-muted/80 transition hover:text-nozomi-text ${
              compact ? 'h-9 w-9' : 'h-10 w-10 hover:bg-white/5'
            }`}
            aria-label="Close"
          >
            <IconClose size={22} />
          </button>
        ) : showBack ? (
          <Link
            to="/"
            className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-nozomi-muted transition hover:bg-white/5 hover:text-nozomi-text"
            aria-label="Back"
          >
            <IconBack />
          </Link>
        ) : (
          <button
            type="button"
            onClick={onSettings}
            className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-nozomi-muted transition hover:bg-white/5 hover:text-nozomi-text"
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
          className={`touch-target flex items-center justify-center rounded-xl text-nozomi-muted/80 transition hover:text-nozomi-purple ${
            compact ? 'h-9 w-9' : 'h-10 w-10 hover:bg-white/5'
          }`}
          aria-label="Settings"
        >
          <IconSliders />
        </button>
      )}
    </header>
  )
}
