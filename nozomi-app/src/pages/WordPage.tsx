import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/ui/AppHeader'
import { WordDetailCard } from '@/components/vocab/WordDetailCard'
import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { useNozomiStore } from '@/store/useNozomiStore'
import { getRelatedVocab, getVocabById } from '@/database/importService'
import type { VocabEntry } from '@/types/domain'

export function WordPage() {
  const navigate = useNavigate()
  const activeVocab = useNozomiStore((s) => s.activeVocab)
  const setActiveVocab = useNozomiStore((s) => s.setActiveVocab)
  const [related, setRelated] = useState<VocabEntry[]>([])
  const [word, setWord] = useState<VocabEntry | null>(activeVocab)

  useEffect(() => {
    async function load() {
      const w = activeVocab ?? (await getVocabById(1)) ?? null
      setWord(w)
      if (w) {
        const rel = await getRelatedVocab(w.category, w.id, 3)
        setRelated(rel)
      }
    }
    void load()
  }, [activeVocab])

  if (!word) {
    return (
      <div className="app-page items-center justify-center px-4">
        <LanguageText text={UI_LABELS.loading} align="center" size="sm" />
      </div>
    )
  }

  return (
    <div className="app-page" data-testid="word-page">
      <AppHeader showBack titleKey="words" onSettings={() => navigate('/settings')} />
      <main className="app-page-scroll px-4 py-6">
        <WordDetailCard
          word={word}
          related={related}
          onSelectRelated={(r) => {
            setActiveVocab(r)
            setWord(r)
          }}
          onPractice={() => navigate('/chat')}
        />
      </main>
    </div>
  )
}
