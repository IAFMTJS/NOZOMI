import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { useNozomiStore } from '@/store/useNozomiStore'

interface Props {
  onToggle: (enabled: boolean) => void
  disabled?: boolean
}

export function StoryModeToggle({ onToggle, disabled }: Props) {
  const storyMode = useNozomiStore((s) => s.settings.voiceStoryMode)
  const session = useNozomiStore((s) => s.voiceSession)
  const inStory =
    session.activeStoryId != null &&
    session.activeStoryBeat != null &&
    session.activeStoryTotalBeats != null

  return (
    <div className="presence-story-mode" data-testid="story-mode-toggle">
      <div
        className="presence-story-mode-track"
        role="group"
        aria-label="Conversation mode"
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggle(false)}
          className={`presence-story-mode-option touch-manipulation ${
            !storyMode ? 'presence-story-mode-option-active' : ''
          }`}
          aria-pressed={!storyMode}
        >
          <LanguageText text={UI_LABELS.conversation} size="sm" passive />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggle(true)}
          className={`presence-story-mode-option touch-manipulation ${
            storyMode ? 'presence-story-mode-option-active' : ''
          }`}
          aria-pressed={storyMode}
        >
          <LanguageText text={UI_LABELS.storyMode} size="sm" passive />
        </button>
      </div>
      {inStory && (
        <span className="presence-story-mode-progress" aria-live="polite">
          {session.activeStoryBeat} / {session.activeStoryTotalBeats}
        </span>
      )}
    </div>
  )
}
