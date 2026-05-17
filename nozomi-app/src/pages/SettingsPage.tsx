import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/ui/AppHeader'
import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'
import { cancelListening, stopSpeaking } from '@/features/voice'
import {
  getSttEngine,
  isBrowserSttSelectable,
  setSttEngine,
  type SttEngine,
} from '@/features/voice/logic/sttEngine'
import { SPEECH_LANG_OPTIONS } from '@/data/speech-lang-options'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import type {
  ImmersionLevel,
  JlptLevel,
  LanguageText as LT,
  ListenEndMode,
  PersonalityMode,
  TtsProvider,
  VoiceListenMode,
  WhisperModelTier,
} from '@/types/domain'
import { NozomiVoicePicker } from '@/features/voice'
import { isIos } from '@/utils/device'
import { formChipClass, formOptionClass } from '@/utils/touch'

const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1']

const PERSONALITY_MODES: { key: PersonalityMode; label: LT }[] = [
  { key: 'calm', label: UI_LABELS.toneCalm },
  { key: 'supportive', label: UI_LABELS.toneSupportive },
  { key: 'playful', label: UI_LABELS.tonePlayful },
  { key: 'teasing', label: UI_LABELS.toneTeasing },
  { key: 'philosophical', label: UI_LABELS.tonePhilosophical },
  { key: 'teacher', label: UI_LABELS.toneTeacher },
]

const STT_ENGINES: { key: SttEngine; label: LT }[] = [
  { key: 'local', label: UI_LABELS.sttEngineLocal },
  { key: 'browser', label: UI_LABELS.sttEngineBrowser },
]

const VOICE_LISTEN_MODES: { key: VoiceListenMode; label: LT }[] = [
  { key: 'push_to_talk', label: UI_LABELS.voiceListenPush },
  { key: 'auto_stop', label: UI_LABELS.voiceListenAutoStop },
  { key: 'continuous', label: UI_LABELS.voiceListenContinuous },
]

const LISTEN_END_MODES: { key: ListenEndMode; label: LT }[] = [
  { key: 'tap', label: UI_LABELS.listenEndTap },
  { key: 'auto', label: UI_LABELS.listenEndAuto },
  { key: 'auto_with_tap', label: UI_LABELS.listenEndAutoWithTap },
]

const TTS_PROVIDERS: { key: TtsProvider; label: LT }[] = [
  { key: 'browser', label: UI_LABELS.ttsBrowser },
  { key: 'cloud', label: UI_LABELS.ttsCloud },
]

const WHISPER_TIERS: { key: WhisperModelTier; label: LT }[] = [
  { key: 'tiny', label: UI_LABELS.whisperTiny },
  { key: 'small', label: UI_LABELS.whisperSmall },
]

const IMMERSION_LEVELS: { key: ImmersionLevel; label: LT }[] = [
  { key: 'beginner', label: UI_LABELS.beginner },
  { key: 'intermediate', label: UI_LABELS.intermediate },
  { key: 'advanced', label: UI_LABELS.advanced },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const settings = useNozomiStore((s) => s.settings)
  const profile = useNozomiStore((s) => s.profile)
  const setSettings = useNozomiStore((s) => s.setSettings)
  const setProfile = useNozomiStore((s) => s.setProfile)
  const clearSession = useNozomiStore((s) => s.clearSession)
  const [sttEngine, setSttEngineState] = useState<SttEngine>(getSttEngine)
  const recognitionLang = resolveSpeechRecognitionLang(settings.speechInputLang)
  const browserSttAllowed = useMemo(
    () => isBrowserSttSelectable(recognitionLang),
    [recognitionLang],
  )
  const activeSpeechLabel =
    SPEECH_LANG_OPTIONS.find((o) => o.key === settings.speechInputLang)?.label.en ??
    settings.speechInputLang

  return (
    <div className="app-page">
      <AppHeader showBack titleKey="settings" hideSettings />
      <main className="app-page-scroll settings-stack py-6">
        <section className="space-y-2">
          <LanguageText text={UI_LABELS.displayName} size="sm" />
          <input
            type="text"
            value={profile.displayName === 'Learner' ? '' : profile.displayName}
            placeholder={UI_LABELS.displayName.en}
            onChange={(e) =>
              setProfile({
                displayName: e.target.value.trim() || 'Learner',
              })
            }
            className="form-input"
          />
        </section>

        <section className="space-y-2">
          <LanguageText text={UI_LABELS.chooseJlpt} size="sm" />
          <div className="form-chip-row">
            {JLPT_LEVELS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setProfile({ jlptLevel: key })}
                className={formChipClass(profile.jlptLevel === key)}
              >
                <span className="font-medium">{key}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <LanguageText text={UI_LABELS.chooseTone} size="sm" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PERSONALITY_MODES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setProfile({ personalityMode: key })}
                className={formOptionClass(profile.personalityMode === key)}
              >
                <LanguageText text={label} size="sm" align="center" passive />
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="section-label px-1">{UI_LABELS.chooseLevel.jp}</p>
          <div className="grid grid-cols-3 gap-2">
            {IMMERSION_LEVELS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setProfile({ immersionLevel: key })}
                className={formOptionClass(profile.immersionLevel === key)}
              >
                <LanguageText text={label} size="sm" align="center" passive />
              </button>
            ))}
          </div>
        </section>

        <SettingToggle
          label={UI_LABELS.showRomaji}
          checked={settings.showRomaji}
          onChange={(v) => setSettings({ showRomaji: v })}
        />
        <SettingToggle
          label={UI_LABELS.showEnglish}
          checked={settings.showEnglish}
          onChange={(v) => setSettings({ showEnglish: v })}
        />
        <SettingToggle
          label={UI_LABELS.voiceEnabled}
          checked={settings.voiceEnabled}
          onChange={(v) => setSettings({ voiceEnabled: v })}
        />
        <SettingToggle
          label={UI_LABELS.suggestionVoiceEnabled}
          checked={settings.suggestionVoiceEnabled}
          onChange={(v) => setSettings({ suggestionVoiceEnabled: v })}
        />

        <section className="space-y-2">
          <LanguageText text={UI_LABELS.sttEngine} size="sm" />
          <div className="grid grid-cols-2 gap-2">
            {STT_ENGINES.filter(
              ({ key }) => key !== 'browser' || browserSttAllowed,
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === sttEngine) return
                  stopSpeaking()
                  cancelListening()
                  useUiStore.getState().resetVoiceUi()
                  setSttEngine(key)
                  setSttEngineState(key)
                }}
                className={formOptionClass(sttEngine === key)}
              >
                <LanguageText text={label} size="sm" align="center" passive />
              </button>
            ))}
          </div>
          {!browserSttAllowed && (
            <p className="px-0.5 text-[10px] leading-snug text-nozomi-muted">
              <LanguageText
                text={isIos() ? UI_LABELS.sttEngineIosNote : UI_LABELS.sttEngineWindowsNote}
                size="sm"
                passive
              />
            </p>
          )}
        </section>

        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <LanguageText text={UI_LABELS.speechInputLang} size="sm" />
            <p className="shrink-0 text-xs text-nozomi-cyan">{activeSpeechLabel}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SPEECH_LANG_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={settings.speechInputLang === key}
                onClick={() => setSettings({ speechInputLang: key })}
                className={formOptionClass(settings.speechInputLang === key)}
              >
                <span className="pointer-events-none block w-full">
                  <LanguageText text={label} size="sm" align="center" passive />
                </span>
              </button>
            ))}
          </div>
          <p className="px-0.5 text-[10px] text-nozomi-muted">
            STT: {resolveSpeechRecognitionLang(settings.speechInputLang)}
          </p>
        </section>

        <section className="space-y-2">
          <LanguageText text={UI_LABELS.voiceListenMode} size="sm" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {VOICE_LISTEN_MODES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={settings.voiceListenMode === key}
                onClick={() => setSettings({ voiceListenMode: key })}
                className={formOptionClass(settings.voiceListenMode === key)}
              >
                <LanguageText text={label} size="sm" align="center" passive />
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <LanguageText text={UI_LABELS.listenEndMode} size="sm" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {LISTEN_END_MODES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={settings.listenEndMode === key}
                onClick={() => setSettings({ listenEndMode: key })}
                className={formOptionClass(settings.listenEndMode === key)}
              >
                <LanguageText text={label} size="sm" align="center" passive />
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <LanguageText text={UI_LABELS.ttsProvider} size="sm" />
          <div className="grid grid-cols-2 gap-2">
            {TTS_PROVIDERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={settings.ttsProvider === key}
                onClick={() => setSettings({ ttsProvider: key })}
                className={formOptionClass(settings.ttsProvider === key)}
              >
                <LanguageText text={label} size="sm" align="center" passive />
              </button>
            ))}
          </div>
          {settings.ttsProvider === 'cloud' && (
            <input
              type="password"
              autoComplete="off"
              placeholder={UI_LABELS.cloudApiKey.en}
              value={settings.cloudTtsApiKey}
              onChange={(e) => setSettings({ cloudTtsApiKey: e.target.value })}
              className="form-input text-sm"
            />
          )}
        </section>

        {sttEngine === 'local' && (
          <section className="space-y-2">
            <LanguageText text={UI_LABELS.whisperModel} size="sm" />
            <div className="grid grid-cols-2 gap-2">
              {WHISPER_TIERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={settings.whisperModel === key}
                  onClick={() => setSettings({ whisperModel: key })}
                  className={formOptionClass(settings.whisperModel === key)}
                >
                  <LanguageText text={label} size="sm" align="center" passive />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <LanguageText text={UI_LABELS.labsSection} size="sm" />
          <SettingToggle
            label={UI_LABELS.labsWakeWord}
            checked={settings.labsWakeWord}
            onChange={(v) => setSettings({ labsWakeWord: v })}
          />
          <SettingToggle
            label={UI_LABELS.labsCloudLlm}
            checked={settings.labsCloudLlm}
            onChange={(v) => setSettings({ labsCloudLlm: v })}
          />
          {settings.labsCloudLlm && (
            <input
              type="password"
              autoComplete="off"
              placeholder={UI_LABELS.cloudApiKey.en}
              value={settings.cloudLlmApiKey}
              onChange={(e) => setSettings({ cloudLlmApiKey: e.target.value })}
              className="form-input text-sm"
            />
          )}
          <SettingToggle
            label={UI_LABELS.labsRealtimeS2s}
            checked={settings.labsRealtimeS2s}
            onChange={(v) => setSettings({ labsRealtimeS2s: v })}
          />
          <SettingToggle
            label={UI_LABELS.labsTelephony}
            checked={settings.labsTelephony}
            onChange={(v) => setSettings({ labsTelephony: v })}
          />
        </section>

        <SettingToggle
          label={UI_LABELS.motionReduce}
          checked={settings.reducedMotion}
          onChange={(v) => setSettings({ reducedMotion: v })}
        />
        <SettingToggle
          label={UI_LABELS.focusMode}
          checked={settings.focusMode}
          onChange={(v) => setSettings({ focusMode: v })}
        />
        <SettingToggle
          label={UI_LABELS.staticOrb}
          checked={settings.staticOrb}
          onChange={(v) => setSettings({ staticOrb: v })}
        />

        <NozomiVoicePicker />

        <div className="glass-panel space-y-2 p-4">
          <LanguageText text={UI_LABELS.voiceSpeed} size="sm" />
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.1}
            value={settings.voiceRate}
            onChange={(e) =>
              setSettings({ voiceRate: parseFloat(e.target.value) })
            }
            className="w-full"
          />
        </div>
        <div className="glass-panel space-y-2 p-4">
          <LanguageText text={UI_LABELS.voicePitch} size="sm" />
          <input
            type="range"
            min={0.5}
            max={1.5}
            step={0.1}
            value={settings.voicePitch}
            onChange={(e) =>
              setSettings({ voicePitch: parseFloat(e.target.value) })
            }
            className="w-full"
          />
        </div>
        <div className="glass-panel space-y-2 p-4">
          <LanguageText text={UI_LABELS.suggestionCount} size="sm" />
          <input
            type="range"
            min={2}
            max={5}
            step={1}
            value={settings.suggestionCount}
            onChange={(e) =>
              setSettings({ suggestionCount: parseInt(e.target.value, 10) })
            }
            className="w-full"
            disabled={settings.focusMode}
          />
          {settings.focusMode && (
            <p className="text-xs text-nozomi-muted">{UI_LABELS.focusMode.en}</p>
          )}
        </div>
        <div className="glass-panel space-y-2 p-4">
          <LanguageText text={UI_LABELS.orbIntensity} size="sm" />
          <input
            type="range"
            min={0.3}
            max={1.5}
            step={0.1}
            value={settings.orbIntensity}
            onChange={(e) =>
              setSettings({ orbIntensity: parseFloat(e.target.value) })
            }
            className="w-full"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            cancelListening()
            stopSpeaking()
            clearSession()
            navigate('/chat')
          }}
          className={`${formOptionClass(false, true)} w-full`}
        >
          <LanguageText
            text={{
              jp: '会話をリセット',
              romaji: 'Kaiwa wo risetto',
              en: 'Reset conversation',
            }}
            size="sm"
            passive
          />
        </button>
        <button
          type="button"
          onClick={() => navigate('/word')}
          className={`${formOptionClass(false, true)} w-full`}
        >
          <LanguageText text={UI_LABELS.words} size="sm" passive />
        </button>
        <button
          type="button"
          onClick={() => navigate('/favorites')}
          className={`${formOptionClass(false, true)} w-full`}
        >
          <LanguageText text={UI_LABELS.favorites} size="sm" passive />
        </button>
        <button
          type="button"
          onClick={() => {
            cancelListening()
            stopSpeaking()
            setProfile({ onboardingComplete: false })
            navigate('/onboarding')
          }}
          className={`${formOptionClass(false, true)} w-full`}
        >
          <LanguageText text={UI_LABELS.restartOnboarding} size="sm" passive />
        </button>
        <button
          type="button"
          onClick={() => navigate('/simulation')}
          className={`${formOptionClass(false, true)} w-full`}
        >
          <LanguageText
            text={{
              jp: 'シミュレーション',
              romaji: 'Shimyureeshon',
              en: 'Simulation Lab',
            }}
            size="sm"
            passive
          />
        </button>
      </main>
    </div>
  )
}

function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: LT
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="form-toggle glass-panel">
      <LanguageText text={label} size="sm" passive />
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="form-toggle-input"
      />
    </label>
  )
}
