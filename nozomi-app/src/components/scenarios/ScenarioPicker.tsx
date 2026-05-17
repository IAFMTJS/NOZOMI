import { motion, AnimatePresence } from 'framer-motion'
import { LanguageText } from '@/components/language/LanguageText'
import { SCENARIO_OPTIONS } from '@/data/scenarios'
import { UI_LABELS } from '@/data/ui-labels'
import type { ScenarioCategory } from '@/types/domain'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (category: ScenarioCategory) => void
}

export function ScenarioPicker({ open, onClose, onSelect }: Props) {
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
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl border border-nozomi-border glass-panel p-6 pb-10"
            role="dialog"
            aria-labelledby="scenario-title"
          >
            <LanguageText
              text={UI_LABELS.chooseScenario}
              size="md"
              align="center"
            />
            <p id="scenario-title" className="sr-only">
              {UI_LABELS.chooseScenario.en}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SCENARIO_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelect(s.id)}
                  className="glass-panel flex min-h-[72px] touch-manipulation flex-col items-center justify-center gap-2 p-4 transition active:scale-[0.98] hover:border-nozomi-purple hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]"
                >
                  <span className="text-2xl" aria-hidden>
                    {s.icon}
                  </span>
                  <LanguageText text={s.label} size="sm" align="center" passive />
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
