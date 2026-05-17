import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WordDetailCard } from '@/components/vocab/WordDetailCard'
import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { getRelatedVocab } from '@/database/importService'
import { useUiStore } from '@/store/useUiStore'
import type { VocabEntry } from '@/types/domain'

export function DesktopContextPanel() {
  const navigate = useNavigate()
  const activeVocab = useUiStore((s) => s.activeVocab)
  const setActiveVocab = useUiStore((s) => s.setActiveVocab)
  const clearActiveVocab = useUiStore((s) => s.clearActiveVocab)
  const [related, setRelated] = useState<VocabEntry[]>([])

  useEffect(() => {
    async function load() {
      if (!activeVocab) {
        setRelated([])
        return
      }
      const rel = await getRelatedVocab(activeVocab.category, activeVocab.id, 4)
      setRelated(rel)
    }
    void load()
  }, [activeVocab])

  return (
    <aside
      data-testid="context-panel"
      className="hidden h-full min-h-0 lg:flex lg:w-72 lg:shrink-0 lg:flex-col lg:border-l lg:border-nozomi-border/30 lg:bg-nozomi-surface/30 xl:w-80"
      aria-label={UI_LABELS.contextPanel.en}
    >
      <div className="flex items-center justify-between border-b border-nozomi-border/20 px-4 py-3">
        <LanguageText text={UI_LABELS.contextPanel} size="sm" />
        {activeVocab && (
          <button
            type="button"
            onClick={clearActiveVocab}
            className="text-nozomi-muted hover:text-nozomi-text text-sm"
            aria-label="Close word panel"
          >
            ×
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {activeVocab ? (
          <WordDetailCard
            word={activeVocab}
            related={related}
            compact
            onSelectRelated={setActiveVocab}
            onPractice={() => navigate('/chat')}
          />
        ) : (
          <div className="glass-panel space-y-3 p-4 text-center">
            <LanguageText text={UI_LABELS.contextPanelEmpty} size="sm" align="center" />
            <LanguageText text={UI_LABELS.tapWordHint} size="sm" align="center" />
          </div>
        )}
      </div>
    </aside>
  )
}
