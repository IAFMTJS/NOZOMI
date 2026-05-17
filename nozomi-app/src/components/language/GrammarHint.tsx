import { useEffect, useState } from 'react'
import { findGrammarForTags } from '@/database/importService'
import type { GrammarPattern } from '@/types/domain'
import { BTN_ICON } from '@/utils/touch'

interface Props {
  grammarTags?: string
  onClose: () => void
}

export function GrammarHint({ grammarTags, onClose }: Props) {
  const [patterns, setPatterns] = useState<GrammarPattern[]>([])

  useEffect(() => {
    let cancelled = false
    void findGrammarForTags(grammarTags, 3).then((p) => {
      if (!cancelled) setPatterns(p)
    })
    return () => {
      cancelled = true
    }
  }, [grammarTags])

  if (!grammarTags) return null

  return (
    <div
      className="mt-2 rounded-xl border border-nozomi-purple/40 bg-purple-950/50 px-3 py-2 text-left"
      role="dialog"
      aria-label="Grammar hint"
    >
      <div className="flex justify-between items-start gap-2 mb-1">
        <p className="text-xs font-semibold text-nozomi-purple uppercase tracking-wide">
          Grammar
        </p>
        <button
          type="button"
          onClick={onClose}
          className={`${BTN_ICON} text-nozomi-muted hover:text-nozomi-text text-lg leading-none`}
          aria-label="Close grammar hint"
        >
          ×
        </button>
      </div>
      {patterns.length === 0 ? (
        <p className="text-xs text-nozomi-muted">{grammarTags}</p>
      ) : (
        <ul className="space-y-2">
          {patterns.map((g) => (
            <li key={g.id}>
              <p className="text-sm font-medium text-nozomi-text">{g.pattern}</p>
              <p className="text-xs text-nozomi-muted">{g.meaning}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
