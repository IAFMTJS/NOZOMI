import type { LanguageText } from '@/types/domain'

/** Compact three-line label like reference nav: EN / JP / Romaji */
export function TriLineLabel({
  text,
  className = '',
}: {
  text: LanguageText
  className?: string
}) {
  return (
    <span className={`flex flex-col items-center gap-0 leading-tight ${className}`}>
      <span className="text-[10px] uppercase tracking-wide text-nozomi-muted">
        {text.en}
      </span>
      <span className="text-xs font-medium text-nozomi-text/90">{text.jp}</span>
      <span className="text-[10px] text-nozomi-muted/80">{text.romaji}</span>
    </span>
  )
}
