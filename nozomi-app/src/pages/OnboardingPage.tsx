import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { NozomiOrb } from '@/components/orb/NozomiOrb'
import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { useNozomiStore } from '@/store/useNozomiStore'
import { primeMicrophonePermission } from '@/systems/speech/speechService'
import type {
  ImmersionLevel,
  JlptLevel,
  LanguageText as LT,
  PersonalityMode,
} from '@/types/domain'
import { BTN_ROW } from '@/utils/touch'

const STEPS = 4

const JLPT_LEVELS: { key: JlptLevel; disabled?: boolean }[] = [
  { key: 'N5' },
  { key: 'N4' },
  { key: 'N3' },
  { key: 'N2' },
  { key: 'N1', disabled: true },
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
                className="flex gap-2 overflow-x-auto pb-1"
                role="listbox"
                aria-label={UI_LABELS.chooseJlpt.en}
              >
                {JLPT_LEVELS.map(({ key, disabled }) => (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => setJlptLevel(key)}
                    className={`${BTN_ROW} shrink-0 px-5 transition ${
                      jlptLevel === key
                        ? 'border-nozomi-accent bg-nozomi-bg-elevated ring-1 ring-nozomi-accent/40'
                        : 'border-white/10 bg-nozomi-bg-elevated/80'
                    } ${disabled ? 'opacity-40' : ''}`}
                    aria-pressed={jlptLevel === key}
                  >
                    <span className="font-medium text-nozomi-text">{key}</span>
                    {disabled && (
                      <span className="mt-0.5 block text-[10px] text-nozomi-muted">
                        soon
                      </span>
                    )}
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
                    className={`${BTN_ROW} w-full border px-4 py-3 text-left transition ${
                      personalityMode === key
                        ? 'border-nozomi-accent bg-nozomi-bg-elevated ring-1 ring-nozomi-accent/40'
                        : 'border-white/10 bg-nozomi-bg-elevated/60'
                    }`}
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
                    className={`${BTN_ROW} transition ${
                      immersionLevel === key
                        ? 'border-nozomi-accent ring-1 ring-nozomi-accent/40'
                        : 'border-white/10'
                    }`}
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
        <div className="flex gap-2" aria-hidden>
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={`h-[3px] w-6 rounded-full transition ${
                i === step
                  ? 'bg-nozomi-live shadow-[0_0_8px_rgba(94,234,212,0.45)]'
                  : 'bg-nozomi-purple/25'
              }`}
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
          className="touch-target min-h-[48px] w-full max-w-xs rounded-full border border-nozomi-accent/50 bg-nozomi-accent/15 px-6 py-3 text-sm font-medium text-nozomi-text transition active:scale-[0.98] disabled:opacity-50"
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
