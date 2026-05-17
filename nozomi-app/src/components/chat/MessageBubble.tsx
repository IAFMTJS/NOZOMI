import { useState } from 'react'
import { motion } from 'framer-motion'
import { LanguageText } from '@/components/language/LanguageText'
import { GrammarHint } from '@/components/language/GrammarHint'
import { IconStar } from '@/components/ui/Icons'
import { useMotionProps } from '@/hooks/useMotionProps'
import { BTN_ICON } from '@/utils/touch'
import type { ChatMessage } from '@/types/domain'

interface Props {
  message: ChatMessage
  onWordTap?: (surface: string) => void
  compact?: boolean
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function MessageBubble({ message, onWordTap, compact = false }: Props) {
  const isUser = message.role === 'user'
  const [grammarOpen, setGrammarOpen] = useState(false)
  const canShowGrammar = !isUser && Boolean(message.grammarTags)
  const motionProps = useMotionProps({
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
  })

  return (
    <motion.div
      {...motionProps}
      className={`flex flex-col ${compact ? 'gap-0.5 px-1' : 'gap-1 px-4'} ${isUser ? 'items-end' : 'items-start'}`}
    >
      <div
        className={`max-w-[92%] ${compact ? 'px-2.5 py-1.5' : 'px-4 py-3'} ${
          isUser ? 'bubble-user' : 'bubble-ai'
        }`}
      >
        {!compact &&
          !isUser &&
          (canShowGrammar ? (
            <button
              type="button"
              onClick={() => setGrammarOpen((o) => !o)}
              className={`${BTN_ICON} mb-2 text-nozomi-purple`}
              aria-expanded={grammarOpen}
              aria-label="Grammar hint"
            >
              <IconStar size={14} />
            </button>
          ) : (
            <span className="mb-2 inline-flex text-nozomi-purple" aria-hidden>
              <IconStar size={14} />
            </span>
          ))}
        <LanguageText
          text={message.text}
          size={compact ? 'sm' : 'md'}
          align={isUser ? 'right' : 'left'}
          tappable={!isUser && Boolean(onWordTap)}
          onWordTap={onWordTap}
        />
        {grammarOpen && !compact && canShowGrammar && (
          <GrammarHint
            grammarTags={message.grammarTags}
            onClose={() => setGrammarOpen(false)}
          />
        )}
      </div>
      {isUser && !compact && (
        <div className="flex items-center gap-1.5 pr-1 text-[10px] text-nozomi-muted">
          <span>{formatTime(message.timestamp)}</span>
          <span className="text-nozomi-purple/80" aria-label="Read">
            ✓✓
          </span>
        </div>
      )}
    </motion.div>
  )
}
