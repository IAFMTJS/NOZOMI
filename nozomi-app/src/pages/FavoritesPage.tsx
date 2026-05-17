import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/ui/AppHeader'
import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { getVocabByIds } from '@/database/importService'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'
import type { VocabEntry } from '@/types/domain'
import { BTN_ROW } from '@/utils/touch'

export function FavoritesPage() {
  const navigate = useNavigate()
  const favoriteIds = useNozomiStore((s) => s.settings.favoriteVocabIds ?? [])
  const setActiveVocab = useUiStore((s) => s.setActiveVocab)
  const [words, setWords] = useState<VocabEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const list = await getVocabByIds(favoriteIds)
      if (!cancelled) {
        setWords(list)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [favoriteIds])

  return (
    <div className="app-page" data-testid="favorites-page">
      <AppHeader showBack titleKey="words" onSettings={() => navigate('/settings')} />
      <main className="app-page-scroll space-y-3 px-4 py-6">
        <LanguageText text={UI_LABELS.favorites} size="md" />
        {loading && <LanguageText text={UI_LABELS.loading} size="sm" passive />}
        {!loading && words.length === 0 && (
          <div className="glass-panel space-y-2 p-6 text-center">
              <LanguageText text={UI_LABELS.favoritesEmpty} size="sm" align="center" />
              <button
                type="button"
                onClick={() => navigate('/word')}
                className={`${BTN_ROW} mx-auto mt-2`}
              >
                <LanguageText text={UI_LABELS.words} size="sm" passive />
              </button>
          </div>
        )}
        {!loading &&
          words.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => {
                setActiveVocab(w)
                navigate('/word')
              }}
              className={`${BTN_ROW} glass-panel w-full text-left`}
            >
              <LanguageText text={w} size="sm" passive />
            </button>
          ))}
      </main>
    </div>
  )
}
