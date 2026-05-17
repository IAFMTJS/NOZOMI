import { LanguageText } from '@/components/language/LanguageText'
import { IconChatBubble } from '@/components/ui/Icons'
import type { Suggestion } from '@/types/domain'
import { UI_LABELS } from '@/data/ui-labels'

interface Props {
  suggestions: Suggestion[]
  onSelect: (s: Suggestion) => void
  compact?: boolean
}

export function SuggestionPills({ suggestions, onSelect, compact = false }: Props) {
  if (!suggestions.length) return null

  const cards = suggestions.map((s, i) => (
    <SuggestionCard
      key={s.id ?? `${s.jp}-${i}`}
      suggestion={s}
      compact={compact}
      onSelect={onSelect}
    />
  ))

  if (compact) {
    return (
      <section className="w-full max-w-sm shrink-0" aria-label="Suggestions">
        <div className="glass-panel w-full overflow-hidden px-2 py-2">
          <p className="mb-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-nozomi-muted">
            {UI_LABELS.suggestions.en}
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
      <p className="section-label mb-2.5 px-0.5">{UI_LABELS.suggestions.en}</p>
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
}: {
  suggestion: Suggestion
  onSelect: (s: Suggestion) => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(suggestion)}
      className={`${compact ? 'suggestion-card-compact' : 'suggestion-card'} shrink-0 snap-start touch-manipulation active:scale-[0.98]`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-lg bg-purple-950/50 text-nozomi-purple ${
          compact ? 'h-6 w-6' : 'mt-0.5 h-8 w-8'
        }`}
      >
        <IconChatBubble size={compact ? 14 : undefined} />
      </span>
      <LanguageText text={suggestion} size="sm" passive />
    </button>
  )
}
