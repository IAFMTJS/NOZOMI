import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LanguageText } from '@/components/language/LanguageText'
import { SCENARIO_OPTIONS } from '@/data/scenarios'
import { UI_LABELS } from '@/data/ui-labels'
import { listStoriesForPicker } from '@/database/importService'
import type { ScenarioCategory, Story } from '@/types/domain'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (category: ScenarioCategory) => void
  onSelectStory?: (storyId: number) => void
}

type Tab = 'scenarios' | 'stories'

export function ScenarioPicker({ open, onClose, onSelect, onSelectStory }: Props) {
  const [tab, setTab] = useState<Tab>('scenarios')
  const [stories, setStories] = useState<Story[]>([])

  useEffect(() => {
    if (!open) return
    void listStoriesForPicker(20).then(setStories)
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            aria-label={UI_LABELS.stop.en}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[75vh] overflow-y-auto rounded-t-3xl border border-nozomi-border glass-panel p-6 pb-10"
            role="dialog"
            aria-labelledby="scenario-title"
            data-testid="scenario-picker"
          >
            <div className="mb-4 flex gap-2 rounded-full border border-white/10 bg-nozomi-bg/60 p-1">
              <button
                type="button"
                onClick={() => setTab('scenarios')}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-medium transition ${
                  tab === 'scenarios'
                    ? 'bg-nozomi-accent/20 text-nozomi-text'
                    : 'text-nozomi-muted'
                }`}
              >
                {UI_LABELS.tabScenarios.en}
              </button>
              <button
                type="button"
                onClick={() => setTab('stories')}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-medium transition ${
                  tab === 'stories'
                    ? 'bg-nozomi-accent/20 text-nozomi-text'
                    : 'text-nozomi-muted'
                }`}
              >
                {UI_LABELS.tabStories.en}
              </button>
            </div>

            {tab === 'scenarios' ? (
              <>
                <LanguageText
                  text={UI_LABELS.chooseScenario}
                  size="md"
                  align="center"
                />
                <p id="scenario-title" className="sr-only">
                  {UI_LABELS.chooseScenario.en}
                </p>
                <motion.div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {SCENARIO_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSelect(s.id)}
                      className="glass-panel flex min-h-[72px] touch-manipulation flex-col items-center justify-center gap-2 p-3 transition active:scale-[0.98] hover:border-nozomi-purple"
                    >
                      <span className="text-2xl" aria-hidden>
                        {s.icon}
                      </span>
                      <LanguageText text={s.label} size="sm" align="center" passive />
                    </button>
                  ))}
                </motion.div>
              </>
            ) : (
              <>
                <LanguageText text={UI_LABELS.chooseStory} size="md" align="center" />
                <div className="mt-4 space-y-2">
                  {stories.map((story) => (
                    <button
                      key={story.id}
                      type="button"
                      onClick={() => onSelectStory?.(story.id)}
                      disabled={!onSelectStory}
                      className="glass-panel flex w-full touch-manipulation flex-col gap-1 p-3 text-left transition hover:border-nozomi-purple disabled:opacity-40"
                    >
                      <span className="font-medium text-nozomi-text">{story.titleJp}</span>
                      <span className="text-xs text-nozomi-muted">
                        {story.titleEn} · {story.jlptLevel}
                      </span>
                    </button>
                  ))}
                  {!stories.length && (
                    <p className="text-center text-xs text-nozomi-muted">
                      {UI_LABELS.loading.en}
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
