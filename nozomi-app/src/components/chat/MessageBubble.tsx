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
  variant?: 'default' | 'float' | 'history'
}

export function MessageBubble({
  message,
  onWordTap,
  compact = false,
  variant = 'default',
}: Props) {
  const isUser = message.role === 'user'
  const [grammarOpen, setGrammarOpen] = useState(false)
  const isFloat = variant === 'float'
  const isHistory = variant === 'history'
  const canShowGrammar =
    !isUser && Boolean(message.grammarTags) && !isFloat && !isHistory
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
          isFloat
            ? `float-bubble ${isUser ? 'float-bubble-user' : 'float-bubble-ai'}`
            : isHistory
              ? `float-bubble ${isUser ? 'float-bubble-user' : 'float-bubble-ai'}`
              : isUser
                ? 'bubble-user'
                : 'bubble-ai'
        }`}
      >
        {!compact && !isUser && canShowGrammar && (
          <button
            type="button"
            onClick={() => setGrammarOpen((o) => !o)}
            className={`${BTN_ICON} mb-2 text-nozomi-purple`}
            aria-expanded={grammarOpen}
            aria-label="Grammar hint"
          >
            <IconStar size={14} />
          </button>
        )}
        <LanguageText
          text={message.text}
          size={compact ? 'sm' : 'md'}
          align={isUser ? 'right' : 'left'}
          hierarchy={isFloat || isHistory ? 'presence' : 'default'}
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
    </motion.div>
  )
}
