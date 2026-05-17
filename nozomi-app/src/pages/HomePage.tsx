import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { NozomiOrb } from '@/components/orb/NozomiOrb'
import { AppHeader } from '@/components/ui/AppHeader'
import { LanguageText } from '@/components/language/LanguageText'
import { TriLineLabel } from '@/components/language/TriLineLabel'
import { ScenarioPicker } from '@/components/scenarios/ScenarioPicker'
import { IconKeyboard, IconMic, IconSuggestions } from '@/components/ui/Icons'
import { UI_LABELS } from '@/data/ui-labels'
import { useOrbSize } from '@/hooks/useVisualViewportHeight'
import { usePersistHydration } from '@/hooks/usePersistHydration'
import { useNozomiStore } from '@/store/useNozomiStore'
import { LiveTranscript } from '@/components/audio/LiveTranscript'
import { useSpeechListen } from '@/contexts/SpeechListenContext'
import type { ScenarioCategory } from '@/types/domain'

export function HomePage() {
  const navigate = useNavigate()
  const hydrated = usePersistHydration()
  const onboardingComplete = useNozomiStore((s) => s.profile.onboardingComplete)
  const startScenario = useNozomiStore((s) => s.startScenario)
  const [pickerOpen, setPickerOpen] = useState(false)
  const { armAndGoToListen } = useSpeechListen()
  const speechState = useNozomiStore((s) => s.speechState)
  const orbSize = useOrbSize(280, 360)

  if (!hydrated) {
    return (
      <div className="app-page items-center justify-center">
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
    navigate('/chat', { state: { scenarioStart: category } })
  }

  return (
    <div className="app-page" data-testid="home-page">
      <AppHeader onSettings={() => navigate('/settings')} />
      <main className="flex flex-1 min-h-0 flex-col items-center justify-center gap-4 overflow-hidden px-6 pb-2">
        <button
          type="button"
          onClick={() => void armAndGoToListen()}
          className="orb-stage touch-target touch-manipulation flex min-h-0 flex-1 w-full max-w-sm items-center justify-center border-0 bg-transparent p-0"
          aria-label={UI_LABELS.speak.en}
        >
          <NozomiOrb size={orbSize} className="relative z-10 pointer-events-none" showPlatform />
        </button>
        <section className="w-full max-w-xs shrink-0 space-y-2 text-center">
          <LiveTranscript speechState={speechState} />
          <p className="font-display text-holo text-xl font-semibold sm:text-2xl">
            {UI_LABELS.readyToTalk.en}
          </p>
          <LanguageText text={UI_LABELS.readyToTalk} size="sm" align="center" />
          <LanguageText text={UI_LABELS.pleaseSpeak} size="sm" align="center" />
          <LanguageText text={UI_LABELS.feelFreeToSpeak} size="sm" align="center" className="text-nozomi-muted/80" />
        </section>
      </main>
      <nav className="grid shrink-0 grid-cols-3 items-end gap-2 px-6 pb-8 safe-bottom">
        <button
          type="button"
          onClick={() => navigate('/chat')}
          className="nav-action touch-manipulation"
        >
          <span className="nav-action-icon"><IconKeyboard /></span>
          <TriLineLabel text={UI_LABELS.type} />
        </button>
        <button
          type="button"
          onClick={() => void armAndGoToListen()}
          className="nav-action touch-manipulation -mt-6"
          aria-label={UI_LABELS.speak.en}
        >
          <span className="nav-mic-btn glow-purple"><IconMic size={28} /></span>
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="nav-action touch-manipulation"
        >
          <span className="nav-action-icon"><IconSuggestions /></span>
          <TriLineLabel text={UI_LABELS.suggestions} />
        </button>
      </nav>
      <ScenarioPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={handleScenario} />
    </div>
  )
}
