import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { useWordTap } from '@/hooks/useWordTap'
import { useNozomiStore } from '@/store/useNozomiStore'
import type { ChatMessage } from '@/types/domain'

interface Props {
  open: boolean
  messages: ChatMessage[]
  onClose: () => void
}

export function ChatHistorySheet({ open, messages, onClose }: Props) {
  const handleWordTap = useWordTap()
  const reduced = useNozomiStore((s) => s.settings.reducedMotion)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.35 }}
            className="history-sheet-backdrop"
            aria-label="Close conversation history"
            onClick={onClose}
          />
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: 40 }}
            transition={{ duration: reduced ? 0 : 0.45 }}
            className="history-sheet"
            role="dialog"
            aria-modal
            aria-label="Conversation history"
          >
            <div className="history-sheet-handle" aria-hidden />
            <div className="flex items-center justify-between px-4 py-3">
              <LanguageText
                text={UI_LABELS.conversation}
                size="sm"
                align="left"
                passive
              />
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1 text-xs text-nozomi-muted transition hover:text-nozomi-text"
              >
                Close
              </button>
            </div>
            <div className="history-sheet-scroll space-y-3">
              {messages.length === 0 ? (
                <p className="px-6 text-center text-sm text-nozomi-muted">
                  {UI_LABELS.saySomething.en}
                </p>
              ) : (
                messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    onWordTap={handleWordTap}
                    variant="history"
                  />
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
