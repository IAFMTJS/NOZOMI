import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { NozomiOrb, OrbAmbienceBridge } from '@/features/orb'
import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { useNozomiStore } from '@/store/useNozomiStore'
import { primeMicrophonePermission } from '@/features/voice'
import type {
  ImmersionLevel,
  JlptLevel,
  LanguageText as LT,
  PersonalityMode,
} from '@/types/domain'
import { formChipClass, formOptionClass } from '@/utils/touch'

const STEPS = 4

const JLPT_LEVELS: { key: JlptLevel }[] = [
  { key: 'N5' },
  { key: 'N4' },
  { key: 'N3' },
  { key: 'N2' },
  { key: 'N1' },
]

const PERSONALITIES: {
  key: PersonalityMode
  label: LT
  sample: LT
}[] = [
  {
    key: 'calm',
    label: UI_LABELS.toneCalm,
    sample: {
      jp: '大丈夫だよ。',
      romaji: 'Daijoubu da yo.',
      en: "It's okay.",
    },
  },
  {
    key: 'supportive',
    label: UI_LABELS.toneSupportive,
    sample: {
      jp: 'いい感じ！',
      romaji: 'Ii kanji!',
      en: 'Nice work!',
    },
  },
  {
    key: 'playful',
    label: UI_LABELS.tonePlayful,
    sample: {
      jp: 'また食べるの？',
      romaji: 'Mata taberu no?',
      en: 'Eating again?',
    },
  },
  {
    key: 'teacher',
    label: UI_LABELS.toneTeacher,
    sample: {
      jp: '「は」を忘れないで。',
      romaji: '"Ha" wo wasurenai de.',
      en: "Don't forget は.",
    },
  },
]

const IMMERSION_LEVELS: { key: ImmersionLevel; label: LT }[] = [
  { key: 'beginner', label: UI_LABELS.beginner },
  { key: 'intermediate', label: UI_LABELS.intermediate },
  { key: 'advanced', label: UI_LABELS.advanced },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const setProfile = useNozomiStore((s) => s.setProfile)
  const [step, setStep] = useState(0)
  const [jlptLevel, setJlptLevel] = useState<JlptLevel>('N5')
  const [personalityMode, setPersonalityMode] =
    useState<PersonalityMode>('calm')
  const [immersionLevel, setImmersionLevel] =
    useState<ImmersionLevel>('beginner')
  const [finishing, setFinishing] = useState(false)

  const finish = async () => {
    setFinishing(true)
    await primeMicrophonePermission().catch(() => false)
    setProfile({
      jlptLevel,
      personalityMode,
      immersionLevel,
      onboardingComplete: true,
    })
    navigate('/', { replace: true })
  }

  return (
    <motion.div
      className="presence-screen safe-top safe-bottom"
      data-testid="onboarding-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <OrbAmbienceBridge />
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-20 pt-8">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              className="flex max-w-sm flex-col items-center gap-6 text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <NozomiOrb size={200} showPlatform />
              <LanguageText
                text={UI_LABELS.onboardingWelcome}
                size="lg"
                align="center"
                hierarchy="presence"
              />
              <LanguageText
                text={UI_LABELS.onboardingDesc}
                size="sm"
                align="center"
                passive
                hierarchy="presence"
              />
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="jlpt"
              className="w-full max-w-md space-y-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <LanguageText
                text={UI_LABELS.chooseJlpt}
                size="md"
                align="center"
                hierarchy="presence"
              />
              <motion.div
                className="form-chip-row"
                role="listbox"
                aria-label={UI_LABELS.chooseJlpt.en}
              >
                {JLPT_LEVELS.map(({ key }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setJlptLevel(key)}
                    className={formChipClass(jlptLevel === key)}
                    aria-pressed={jlptLevel === key}
                  >
                    <span className="font-medium text-nozomi-text">{key}</span>
                  </button>
                ))}
              </motion.div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="tone"
              className="w-full max-w-md space-y-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <LanguageText
                text={UI_LABELS.chooseTone}
                size="md"
                align="center"
                hierarchy="presence"
              />
              <motion.div className="grid gap-2">
                {PERSONALITIES.map(({ key, label, sample }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPersonalityMode(key)}
                    className={formOptionClass(personalityMode === key, true)}
                    aria-pressed={personalityMode === key}
                  >
                    <LanguageText text={label} size="sm" passive />
                    <p className="msg-jp mt-1 text-sm text-nozomi-text-secondary">
                      {sample.jp}
                    </p>
                  </button>
                ))}
              </motion.div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="immersion"
              className="w-full max-w-md space-y-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <LanguageText
                text={UI_LABELS.chooseLevel}
                size="md"
                align="center"
                hierarchy="presence"
              />
              <motion.div className="grid grid-cols-3 gap-2">
                {IMMERSION_LEVELS.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setImmersionLevel(key)}
                    className={formOptionClass(immersionLevel === key)}
                    aria-pressed={immersionLevel === key}
                  >
                    <LanguageText text={label} size="sm" align="center" passive />
                  </button>
                ))}
              </motion.div>
              <LanguageText
                text={UI_LABELS.allowMic}
                size="sm"
                align="center"
                passive
                hierarchy="presence"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="flex shrink-0 flex-col items-center gap-6 px-6 pb-8">
        <div className="onboarding-steps" aria-hidden>
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={`onboarding-step ${i === step ? 'onboarding-step-active' : ''}`}
            />
          ))}
        </div>
        <button
          type="button"
          disabled={finishing}
          onClick={() => {
            if (step < STEPS - 1) setStep((s) => s + 1)
            else void finish()
          }}
          className="btn-primary"
        >
          {step < STEPS - 1 ? (
            <LanguageText text={UI_LABELS.next} size="sm" align="center" passive />
          ) : (
            <LanguageText
              text={UI_LABELS.onboardingReady}
              size="sm"
              align="center"
              passive
            />
          )}
        </button>
      </footer>
    </motion.div>
  )
}
