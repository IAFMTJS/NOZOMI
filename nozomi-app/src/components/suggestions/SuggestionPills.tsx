import { LanguageText } from '@/components/language/LanguageText'
import type { Suggestion } from '@/types/domain'
import { UI_LABELS } from '@/data/ui-labels'

export function suggestionKey(s: Suggestion, index: number): string {
  return s.id ?? `${s.jp}-${index}`
}

interface Props {
  suggestions: Suggestion[]
  onSelect: (s: Suggestion) => void
  compact?: boolean
  selectedKey?: string | null
}

export function SuggestionPills({
  suggestions,
  onSelect,
  compact = false,
  selectedKey = null,
}: Props) {
  if (!suggestions.length) return null

  const cards = suggestions.map((s, i) => (
    <SuggestionCard
      key={suggestionKey(s, i)}
      suggestion={s}
      compact={compact}
      selected={suggestionKey(s, i) === selectedKey}
      onSelect={onSelect}
    />
  ))

  if (compact) {
    return (
      <section className="w-full max-w-sm shrink-0" aria-label="Suggestions">
        <div className="glass-panel w-full overflow-hidden px-2 py-2">
          <p className="section-label mb-1.5 text-center">
            {UI_LABELS.suggestions.jp}
          </p>
          <div className="suggestion-scroll flex gap-2 pb-0.5 snap-x snap-mandatory scrollbar-thin">
            {cards}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="px-4 pb-2 pt-1" aria-label="Suggestions">
      <p className="section-label mb-2.5 px-0.5">{UI_LABELS.suggestions.jp}</p>
      <div className="suggestion-scroll flex gap-2.5 pb-2 snap-x snap-mandatory scrollbar-thin">
        {cards}
      </div>
    </section>
  )
}

function SuggestionCard({
  suggestion,
  onSelect,
  compact = false,
  selected = false,
}: {
  suggestion: Suggestion
  onSelect: (s: Suggestion) => void
  compact?: boolean
  selected?: boolean
}) {
  const base = compact ? 'suggestion-card-compact' : 'suggestion-card'
  return (
    <button
      type="button"
      onClick={() => onSelect(suggestion)}
      aria-pressed={selected}
      className={`${base}${selected ? ' suggestion-card-selected' : ''} shrink-0 snap-start touch-manipulation active:scale-[0.98]`}
    >
      <LanguageText text={suggestion} size="sm" passive className="font-jp" />
    </button>
  )
}
