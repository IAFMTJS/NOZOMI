import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { usePersistHydration } from '@/hooks/usePersistHydration'
import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { useNozomiStore } from '@/store/useNozomiStore'
import type { ImmersionLevel, LanguageText as LT, PersonalityMode } from '@/types/domain'
import { MicPermissionBanner } from '@/components/audio/MicPermissionBanner'
import { NozomiOrb } from '@/components/orb/NozomiOrb'
import { speechSupported } from '@/systems/speech/speechService'
import { BTN_ROW } from '@/utils/touch'

type InputMode = 'voice' | 'text' | 'both'

const LEVELS: { key: ImmersionLevel; label: typeof UI_LABELS.beginner }[] = [
  { key: 'beginner', label: UI_LABELS.beginner },
  { key: 'intermediate', label: UI_LABELS.intermediate },
  { key: 'advanced', label: UI_LABELS.advanced },
]

const TONES: { key: PersonalityMode; label: LT }[] = [
  { key: 'calm', label: UI_LABELS.toneCalm },
  { key: 'supportive', label: UI_LABELS.toneSupportive },
  { key: 'playful', label: UI_LABELS.tonePlayful },
  { key: 'teasing', label: UI_LABELS.toneTeasing },
  { key: 'philosophical', label: UI_LABELS.tonePhilosophical },
  { key: 'teacher', label: UI_LABELS.toneTeacher },
]

const INPUT_OPTIONS: { key: InputMode; label: LT }[] = [
  { key: 'voice', label: UI_LABELS.inputVoice },
  { key: 'text', label: UI_LABELS.inputText },
  { key: 'both', label: UI_LABELS.inputBoth },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const hydrated = usePersistHydration()
  const onboardingComplete = useNozomiStore((s) => s.profile.onboardingComplete)
  const setProfile = useNozomiStore((s) => s.setProfile)
  const startScenario = useNozomiStore((s) => s.startScenario)
  const [step, setStep] = useState(0)
  const [inputMode, setInputMode] = useState<InputMode>('both')
  const [micGranted, setMicGranted] = useState(false)
  const [micDenied, setMicDenied] = useState(false)
  const [level, setLevel] = useState<ImmersionLevel>('beginner')
  const [tone, setTone] = useState<PersonalityMode>('calm')

  if (!hydrated) {
    return (
      <div className="app-page items-center justify-center">
        <NozomiOrb size={160} />
      </div>
    )
  }

  if (onboardingComplete) {
    return <Navigate to="/" replace />
  }

  const wantsVoice = inputMode === 'voice' || inputMode === 'both'
  const useVoice = wantsVoice

  const requestMic = async () => {
    if (!speechSupported().stt) {
      setMicDenied(true)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setMicGranted(true)
      setMicDenied(false)
    } catch {
      setMicGranted(false)
      setMicDenied(true)
    }
  }

  const finish = () => {
    const jlpt =
      level === 'advanced' ? 'N3' : level === 'intermediate' ? 'N4' : 'N5'
    setProfile({
      immersionLevel: level,
      jlptLevel: jlpt,
      personalityMode: tone,
      onboardingComplete: true,
    })
    useNozomiStore.getState().setSettings({ voiceEnabled: useVoice })
    startScenario('daily')
    navigate('/chat', { state: { scenarioStart: 'daily' } })
  }

  return (
    <div className="app-page px-6 py-6 safe-top">
      <NozomiOrb size={140} className="mx-auto mb-4 shrink-0" />
      <div className="mb-4 flex shrink-0 justify-center gap-1.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-6 rounded-full ${
              i <= step ? 'bg-nozomi-purple' : 'bg-nozomi-border/40'
            }`}
          />
        ))}
      </div>

      <div className="app-page-scroll">
      {step === 0 && (
        <div className="space-y-6 text-center flex-1 flex flex-col justify-center">
          <LanguageText text={UI_LABELS.onboardingWelcome} size="lg" align="center" />
          <LanguageText text={UI_LABELS.onboardingDesc} align="center" />
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`${BTN_ROW} mt-8 w-full bg-nozomi-purple`}
          >
            <LanguageText text={UI_LABELS.continue} align="center" size="sm" passive />
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6 flex-1">
          <LanguageText text={UI_LABELS.chooseInput} size="md" />
          <div className="space-y-2">
            {INPUT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setInputMode(opt.key)}
                className={`${BTN_ROW} glass-panel w-full text-left ${
                  inputMode === opt.key ? 'border-nozomi-purple' : ''
                }`}
              >
                <LanguageText text={opt.label} size="sm" passive />
              </button>
            ))}
          </div>
          {wantsVoice && (
            <div className="space-y-2">
              {speechSupported().stt && (
                <button
                  type="button"
                  onClick={() => void requestMic()}
                  className={`${BTN_ROW} w-full border border-nozomi-purple`}
                >
                  <LanguageText
                    text={micGranted ? UI_LABELS.micReady : UI_LABELS.allowMic}
                    align="center"
                    size="sm"
                    passive
                  />
                </button>
              )}
              {micDenied && (
                <MicPermissionBanner showSecondary className="max-w-none w-full" />
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`${BTN_ROW} w-full bg-nozomi-purple`}
          >
            <LanguageText text={UI_LABELS.next} align="center" size="sm" passive />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 flex-1">
          <LanguageText text={UI_LABELS.chooseLevel} size="md" />
          <div className="space-y-2">
            {LEVELS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setLevel(l.key)}
                className={`${BTN_ROW} glass-panel w-full text-left ${
                  level === l.key ? 'border-nozomi-purple' : ''
                }`}
              >
                <LanguageText text={l.label} size="sm" passive />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(3)}
            className={`${BTN_ROW} w-full bg-nozomi-purple`}
          >
            <LanguageText text={UI_LABELS.next} align="center" size="sm" passive />
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 flex-1">
          <LanguageText text={UI_LABELS.chooseTone} size="md" />
          <div className="grid grid-cols-2 gap-2">
            {TONES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTone(t.key)}
                className={`${BTN_ROW} glass-panel ${
                  tone === t.key ? 'border-nozomi-purple' : ''
                }`}
              >
                <LanguageText text={t.label} size="sm" align="center" passive />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setStep(4)}
            className={`${BTN_ROW} w-full bg-nozomi-purple`}
          >
            <LanguageText text={UI_LABELS.next} align="center" size="sm" passive />
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6 flex-1 flex flex-col justify-center text-center">
          <LanguageText text={UI_LABELS.onboardingReady} size="lg" align="center" />
          <LanguageText text={UI_LABELS.tapWordHint} size="sm" align="center" />
          <LanguageText text={UI_LABELS.feelFreeToSpeak} size="sm" align="center" />
          <button
            type="button"
            onClick={finish}
            className={`${BTN_ROW} mt-4 w-full bg-nozomi-purple glow-purple`}
          >
            <LanguageText text={UI_LABELS.startChat} align="center" size="sm" passive />
          </button>
        </div>
      )}
      </div>
    </div>
  )
}
