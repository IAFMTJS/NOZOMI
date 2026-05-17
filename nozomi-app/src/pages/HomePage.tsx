import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { NozomiOrb } from '@/components/orb/NozomiOrb'
import { AppHeader } from '@/components/ui/AppHeader'
import { LanguageText } from '@/components/language/LanguageText'
import { ScenarioPicker } from '@/components/scenarios/ScenarioPicker'
import { PresenceDock } from '@/components/presence/PresenceDock'
import { PresenceStatusRow } from '@/components/presence/PresenceStatusRow'
import { StoryModeToggle } from '@/components/presence/StoryModeToggle'
import { useConversation } from '@/hooks/useConversation'
import { FloatingTurnBubbles } from '@/components/presence/FloatingTurnBubbles'
import { UI_LABELS } from '@/data/ui-labels'
import { useOrbSize } from '@/hooks/useVisualViewportHeight'
import { usePersistHydration } from '@/hooks/usePersistHydration'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useSpeechListen } from '@/contexts/SpeechListenContext'
import type { ScenarioCategory } from '@/types/domain'

export function HomePage() {
  const navigate = useNavigate()
  const hydrated = usePersistHydration()
  const onboardingComplete = useNozomiStore((s) => s.profile.onboardingComplete)
  const startScenario = useNozomiStore((s) => s.startScenario)
  const speechState = useNozomiStore((s) => s.speechState)
  const orbState = useNozomiStore((s) => s.orbState)
  const voiceMessages = useNozomiStore((s) => s.voiceMessages)
  const [pickerOpen, setPickerOpen] = useState(false)
  const { armAndGoToListen } = useSpeechListen()
  const { setVoiceStoryMode } = useConversation()
  const voiceTurnCount = useNozomiStore((s) => s.voiceSession.turnCount)
  const showStoryToggle = voiceTurnCount >= 5
  const orbSize = useOrbSize(380, 240)

  if (!hydrated) {
    return (
      <div className="presence-screen items-center justify-center">
        <NozomiOrb size={160} />
      </div>
    )
  }

  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  const handleScenario = (category: ScenarioCategory) => {
    startScenario(category)
    setPickerOpen(false)
    navigate('/listen', { state: { scenarioStart: category } })
  }

  return (
    <div className="presence-screen" data-testid="home-page">
      <AppHeader compact onSettings={() => navigate('/settings')} />
      {showStoryToggle && (
        <StoryModeToggle onToggle={(enabled) => void setVoiceStoryMode(enabled)} />
      )}
      <PresenceStatusRow speechState={speechState} orbState={orbState} />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <FloatingTurnBubbles messages={voiceMessages} />

        <section className="presence-stage">
          <button
            type="button"
            onClick={() => void armAndGoToListen()}
            className="presence-orb-anchor touch-target touch-manipulation"
            aria-label={UI_LABELS.speak.en}
          >
            <span className="presence-orb-glow" aria-hidden />
            <span className="presence-orb-ring" aria-hidden />
            <NozomiOrb size={orbSize} className="relative z-10 pointer-events-none" showPlatform />
          </button>
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
          onClick: () => void armAndGoToListen(),
        }}
        right={{
          id: 'suggestions',
          label: UI_LABELS.suggestions,
          icon: 'suggestions',
          onClick: () => setPickerOpen(true),
        }}
      />

      <ScenarioPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleScenario} />
    </div>
  )
}
