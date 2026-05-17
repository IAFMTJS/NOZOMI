import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/ui/AppHeader'
import { WordDetailCard } from '@/components/vocab/WordDetailCard'
import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { useUiStore } from '@/store/useUiStore'
import {
  getDefaultVocab,
  getRelatedVocab,
  getVocabById,
} from '@/database/importService'
import type { VocabEntry } from '@/types/domain'
import { BTN_ROW } from '@/utils/touch'

export function WordPage() {
  const navigate = useNavigate()
  const dataReady = useUiStore((s) => s.dataReady)
  const activeVocab = useUiStore((s) => s.activeVocab)
  const setActiveVocab = useUiStore((s) => s.setActiveVocab)
  const [related, setRelated] = useState<VocabEntry[]>([])
  const [word, setWord] = useState<VocabEntry | null>(activeVocab)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!dataReady) return
    let cancelled = false
    async function load() {
      setLoadError(false)
      try {
        const w =
          activeVocab ??
          (await getVocabById(1)) ??
          (await getDefaultVocab())
        if (cancelled) return
        if (!w) {
          setLoadError(true)
          setWord(null)
          return
        }
        setWord(w)
        const rel = await getRelatedVocab(w.category, w.id, 3)
        if (!cancelled) setRelated(rel)
      } catch {
        if (!cancelled) {
          setLoadError(true)
          setWord(null)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [activeVocab, dataReady])

  if (!dataReady) {
    return (
      <div className="app-page items-center justify-center px-4">
        <LanguageText text={UI_LABELS.loading} align="center" size="sm" />
      </div>
    )
  }

  if (loadError || !word) {
    return (
      <div className="app-page items-center justify-center px-4" data-testid="word-page">
        <div className="max-w-sm space-y-4 text-center">
          <LanguageText text={UI_LABELS.wordsLoadError} align="center" size="sm" />
          <button
            type="button"
            onClick={() => navigate('/chat')}
            className={`${BTN_ROW} mx-auto`}
          >
            <LanguageText text={UI_LABELS.chatNav} size="sm" passive />
          </button>
        </div>
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
