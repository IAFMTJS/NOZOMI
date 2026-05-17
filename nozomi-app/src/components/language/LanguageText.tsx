import { useState } from 'react'
import {
  getLanguageVisibility,
  normalizeLanguageText,
} from '@/utils/languageVisibility'
import { useNozomiStore } from '@/store/useNozomiStore'
import { UI_LABELS } from '@/data/ui-labels'
import type { LanguageText as LanguageTextType } from '@/types/domain'
import { useRomajiFallback } from '@/hooks/useRomajiFallback'
import { BTN_TOUCH } from '@/utils/touch'
import { TappableJapanese } from './TappableJapanese'

interface Props {
  text: LanguageTextType | Partial<LanguageTextType>
  size?: 'xs' | 'sm' | 'md' | 'lg'
  align?: 'left' | 'center' | 'right'
  className?: string
  tappable?: boolean
  onWordTap?: (surface: string) => void
  /** Inside <button>: do not steal taps from the parent control */
  passive?: boolean
  /** Presence layout: clear JP / romaji / EN hierarchy */
  hierarchy?: 'default' | 'presence'
}

export function LanguageText({
  text,
  size = 'md',
  align = 'left',
  className = '',
  tappable = false,
  onWordTap,
  passive = false,
  hierarchy = 'default',
}: Props) {
  const profile = useNozomiStore((s) => s.profile)
  const settings = useNozomiStore((s) => s.settings)
  const normalized = normalizeLanguageText(text)
  const resolvedRomaji = useRomajiFallback(normalized.jp, normalized.romaji)
  const display = { ...normalized, romaji: resolvedRomaji }
  const vis = getLanguageVisibility(profile.immersionLevel, settings)
  const [revealed, setRevealed] = useState(false)

  const presence = hierarchy === 'presence'
  const jpSize = presence
    ? size === 'xs'
      ? 'msg-jp text-xs leading-tight'
      : size === 'sm'
        ? 'msg-jp text-sm'
        : size === 'lg'
          ? 'msg-jp text-2xl md:text-3xl'
          : 'msg-jp text-lg'
    : size === 'lg'
      ? 'text-2xl md:text-3xl font-semibold'
      : size === 'sm'
        ? 'text-base font-medium'
        : 'text-xl font-semibold'
  const romajiSize = presence
    ? size === 'xs'
      ? 'msg-romaji text-[10px] leading-tight'
      : 'msg-romaji text-xs'
    : size === 'lg'
      ? 'text-sm'
      : 'text-xs'
  const enSize = presence
    ? size === 'xs'
      ? 'msg-en text-[10px] leading-tight'
      : 'msg-en text-[0.6875rem]'
    : vis.englishSubtle
      ? 'text-xs opacity-50'
      : 'text-xs opacity-70'

  const alignClass =
    align === 'center'
      ? 'text-center'
      : align === 'right'
        ? 'text-right'
        : 'text-left'

  const romajiBehind =
    vis.revealRomaji || (vis.revealSupport && !!display.romaji)
  const enBehind =
    vis.revealEnglish || (vis.revealSupport && !!display.en)

  const showRomaji =
    !!display.romaji &&
    (!romajiBehind || revealed) &&
    (vis.showRomaji || (vis.revealSupport && revealed))
  const showEnglish =
    !!display.en &&
    (!enBehind || revealed) &&
    (vis.showEnglish || vis.revealEnglish || (vis.revealSupport && revealed))

  const canReveal =
    !passive &&
    ((romajiBehind && !!display.romaji) || (enBehind && !!display.en))

  const handleReveal = () => {
    if (canReveal) setRevealed((r) => !r)
  }

  const wordTap = tappable && !passive ? onWordTap : undefined
  const hint = UI_LABELS.tapForTranslation

  return (
    <div
      className={`flex flex-col gap-0.5 ${alignClass} ${className}`}
      role="group"
      aria-label={`${display.jp}. ${display.en || display.romaji}`}
    >
      {vis.showJapanese && (
        <TappableJapanese
          text={display.jp}
          className={`${jpSize} ${presence ? '' : 'text-nozomi-text'} leading-snug`}
          onWordTap={wordTap}
        />
      )}
      {showRomaji && (
        <p
          className={`${romajiSize} ${presence ? '' : 'text-nozomi-muted italic'}`}
        >
          {display.romaji}
        </p>
      )}
      {showEnglish && (
        <p className={`${enSize} ${presence ? '' : 'text-nozomi-muted'}`}>
          {display.en}
        </p>
      )}
      {canReveal && (
        <button
          type="button"
          onClick={handleReveal}
          className={`${BTN_TOUCH} ${romajiSize} min-h-[44px] italic ${
            revealed ? 'text-nozomi-muted/50' : 'text-nozomi-muted/70'
          } ${alignClass}`}
        >
          {revealed ? hint.en : (
            <>
              {hint.jp}
              <span className="mx-1 opacity-40">·</span>
              {hint.en}
            </>
          )}
        </button>
      )}
    </div>
  )
}
