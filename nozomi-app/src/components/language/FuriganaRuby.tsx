interface Props {
  kanji?: string
  reading: string
  className?: string
}

/** Show reading above kanji when both are present */
export function FuriganaRuby({ kanji, reading, className = '' }: Props) {
  if (!kanji?.trim()) {
    return <span className={className}>{reading}</span>
  }
  if (!reading.trim() || kanji === reading) {
    return <span className={className}>{kanji}</span>
  }
  return (
    <ruby className={`ruby-align-inter-character ${className}`}>
      {kanji}
      <rt className="text-[0.55em] text-nozomi-muted font-normal">{reading}</rt>
    </ruby>
  )
}
