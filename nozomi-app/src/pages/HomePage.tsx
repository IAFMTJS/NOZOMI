import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { NozomiOrb, OrbAmbienceBridge, PresenceOrbShell } from '@/features/orb'
import { useConversation } from '@/features/conversation'
import {
  FloatingTurnBubbles,
  PresenceDock,
  PresenceStatusRow,
  StoryModeToggle,
} from '@/features/presence'
import { startMicCaptureFromGesture, useSpeechListen } from '@/features/voice'
import { AppHeader } from '@/components/ui/AppHeader'
import { LanguageText } from '@/components/language/LanguageText'
import { ScenarioPicker } from '@/components/scenarios/ScenarioPicker'
import { UI_LABELS } from '@/data/ui-labels'
import { useOrbSize } from '@/hooks/useVisualViewportHeight'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'
import type { ScenarioCategory } from '@/types/domain'

export function HomePage() {
  const navigate = useNavigate()
  const startScenario = useNozomiStore((s) => s.startScenario)
  const speechState = useUiStore((s) => s.speechState)
  const orbState = useUiStore((s) => s.orbState)
  const voiceMessages = useNozomiStore((s) => s.voiceMessages)
  const [pickerOpen, setPickerOpen] = useState(false)
  const { armAndGoToListen } = useSpeechListen()
  const { setVoiceStoryMode } = useConversation()
  const voiceTurnCount = useNozomiStore((s) => s.voiceSession.turnCount)
  const showStoryToggle = voiceTurnCount >= 2
  const orbSize = useOrbSize(380, 240)

  const handleScenario = (category: ScenarioCategory) => {
    startScenario(category)
    setPickerOpen(false)
    navigate('/listen', { state: { scenarioStart: category } })
  }

  const handleStory = (storyId: number) => {
    setPickerOpen(false)
    navigate('/listen', { state: { storyStart: storyId } })
  }

  const handleSpeak = () => {
    startMicCaptureFromGesture()
    void armAndGoToListen()
  }

  return (
    <div className="presence-screen" data-testid="home-page">
      <OrbAmbienceBridge />
      <AppHeader compact onSettings={() => navigate('/settings')} />
      {showStoryToggle && (
        <StoryModeToggle onToggle={(enabled) => void setVoiceStoryMode(enabled)} />
      )}
      <PresenceStatusRow speechState={speechState} orbState={orbState} />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <FloatingTurnBubbles messages={voiceMessages} />

        <section className="presence-stage">
          <PresenceOrbShell
            speechState={speechState}
            orbState={orbState}
            onClick={handleSpeak}
            aria-label={UI_LABELS.speak.en}
          >
            <NozomiOrb size={orbSize} className="relative z-10 pointer-events-none" showPlatform />
          </PresenceOrbShell>
          {voiceMessages.length === 0 && (
            <div className="presence-hint mt-4 max-w-xs space-y-1">
              <LanguageText
                text={UI_LABELS.readyToTalk}
                size="sm"
                align="center"
                hierarchy="presence"
              />
              <LanguageText
                text={UI_LABELS.tapOrbToSpeak}
                size="sm"
                align="center"
                passive
                hierarchy="presence"
              />
            </div>
          )}
        </section>
      </div>

      <PresenceDock
        left={{
          id: 'type',
          label: UI_LABELS.type,
          icon: 'keyboard',
          onClick: () => navigate('/chat'),
        }}
        center={{
          id: 'mic',
          label: UI_LABELS.speak,
          icon: 'mic',
          onClick: handleSpeak,
        }}
        right={{
          id: 'suggestions',
          label: UI_LABELS.suggestions,
          icon: 'suggestions',
          onClick: () => setPickerOpen(true),
        }}
      />

      <ScenarioPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleScenario}
        onSelectStory={handleStory}
      />
    </div>
  )
}
