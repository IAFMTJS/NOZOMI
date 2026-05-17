import { MessageBubble } from '@/components/chat/MessageBubble'
import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { useWordTap } from '@/hooks/useWordTap'
import { useNozomiStore } from '@/store/useNozomiStore'

export function VoiceTurnPanel() {
  const handleWordTap = useWordTap()
  const messages = useNozomiStore((s) => s.voiceMessages)
  const recent = messages.slice(-2)
  if (recent.length === 0) return null

  return (
    <div
      className="glass-panel mx-auto w-full max-w-md max-h-[min(24vh,6.5rem)] shrink-0 space-y-1 overflow-y-auto px-2 py-1.5"
      data-testid="voice-turn-panel"
    >
      <LanguageText
        text={UI_LABELS.conversation}
        size="sm"
        align="center"
        className="opacity-80"
      />
      {recent.map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          onWordTap={handleWordTap}
          compact
        />
      ))}
    </div>
  )
}
