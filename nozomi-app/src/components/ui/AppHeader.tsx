import { Link } from 'react-router-dom'
import { IconBack, IconClose, IconMenu, IconSliders } from '@/components/ui/Icons'

interface Props {
  showBack?: boolean
  title?: string
  titleKey?: 'appName' | 'words' | 'settings'
  onSettings?: () => void
  hideSettings?: boolean
  onClose?: () => void
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
}: Props) {
  const displayTitle = title ?? TITLE_MAP[titleKey] ?? 'NOZOMI'

  return (
    <header className="flex items-center justify-between px-4 py-3 safe-top">
      <div className="flex w-10 items-center justify-start">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-nozomi-muted transition hover:bg-white/5 hover:text-nozomi-text"
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

      <h1 className="font-display text-xs font-bold tracking-[0.4em] text-holo sm:text-sm">
        {displayTitle}
      </h1>

      {hideSettings ? (
        <div className="w-10" aria-hidden />
      ) : (
        <button
          type="button"
          onClick={onSettings}
          className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-nozomi-muted transition hover:bg-white/5 hover:text-nozomi-purple"
          aria-label="Settings"
        >
          <IconSliders />
        </button>
      )}
    </header>
  )
}
