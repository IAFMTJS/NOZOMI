import { motion, AnimatePresence } from 'framer-motion'
import { LanguageText } from '@/components/language/LanguageText'
import { useMotionProps } from '@/hooks/useMotionProps'
import { useWordTap } from '@/hooks/useWordTap'
import { useUiStore } from '@/store/useUiStore'
import type { ChatMessage } from '@/types/domain'

function FloatBubble({
  message,
  onWordTap,
}: {
  message: ChatMessage
  onWordTap?: (surface: string) => void
}) {
  const isUser = message.role === 'user'
  const motionProps = useMotionProps({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45 },
  })

  return (
    <motion.div
      {...motionProps}
      className={isUser ? 'presence-float-user' : 'presence-float-ai'}
    >
      <div
        className={`float-bubble ${isUser ? 'float-bubble-user' : 'float-bubble-ai'}`}
      >
        <LanguageText
          text={message.text}
          size="xs"
          align={isUser ? 'right' : 'left'}
          hierarchy="presence"
          className="gap-0"
          tappable={!isUser && Boolean(onWordTap)}
          onWordTap={onWordTap}
        />
      </div>
    </motion.div>
  )
}

interface Props {
  messages: ChatMessage[]
  className?: string
  onViewHistory?: () => void
}

export function FloatingTurnBubbles({
  messages,
  className = '',
  onViewHistory,
}: Props) {
  const handleWordTap = useWordTap()
  const orbState = useUiStore((s) => s.orbState)
  const motionProps = useMotionProps({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 },
  })
  const recent = messages.slice(-2)

  if (recent.length === 0) return null

  return (
    <motion.div
      {...motionProps}
      className={`presence-float-layer float-bubble-edge-fade pt-2 ${className} ${
        orbState === 'thinking' ? 'presence-dimmed' : ''
      }`}
      data-testid="voice-turn-panel"
    >
      <AnimatePresence mode="sync">
        {recent.map((m) => (
          <FloatBubble
            key={m.id}
            message={m}
            onWordTap={m.role === 'user' ? undefined : handleWordTap}
          />
        ))}
      </AnimatePresence>
      {onViewHistory && messages.length > 2 && (
        <button
          type="button"
          onClick={onViewHistory}
          className="mx-auto mt-1 block text-[0.625rem] tracking-wide text-nozomi-muted/60 transition hover:text-nozomi-muted"
        >
          View conversation
        </button>
      )}
    </motion.div>
  )
}
