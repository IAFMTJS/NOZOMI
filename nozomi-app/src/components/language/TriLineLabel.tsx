import type { LanguageText } from '@/types/domain'

/** Dock label: JP only by default; full tri-line when `verbose` */
export function TriLineLabel({
  text,
  className = '',
  verbose = false,
}: {
  text: LanguageText
  className?: string
  verbose?: boolean
}) {
  if (!verbose) {
    return (
      <span
        className={`msg-jp text-[10px] font-medium leading-tight text-nozomi-text/80 ${className}`}
      >
        {text.jp}
      </span>
    )
  }
  return (
    <span className={`flex flex-col items-center gap-0 leading-tight ${className}`}>
      <span className="text-[10px] uppercase tracking-wide text-nozomi-muted">
        {text.en}
      </span>
      <span className="msg-jp text-xs font-medium text-nozomi-text/90">{text.jp}</span>
      <span className="text-[10px] text-nozomi-muted/80">{text.romaji}</span>
    </span>
  )
}
