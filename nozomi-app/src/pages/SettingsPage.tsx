import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/ui/AppHeader'
import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { useNozomiStore } from '@/store/useNozomiStore'
import { getSttEngine, setSttEngine, type SttEngine } from '@/systems/speech/sttEngine'
import { SPEECH_LANG_OPTIONS } from '@/data/speech-lang-options'
import type { ImmersionLevel, LanguageText as LT } from '@/types/domain'
import { BTN_ROW } from '@/utils/touch'

const STT_ENGINES: { key: SttEngine; label: LT }[] = [
  { key: 'local', label: UI_LABELS.sttEngineLocal },
  { key: 'browser', label: UI_LABELS.sttEngineBrowser },
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

  return (
    <div className="app-page">
      <AppHeader showBack titleKey="settings" />
      <main className="app-page-scroll space-y-4 px-4 py-6">
        <section className="space-y-2">
          <p className="section-label px-1">
            {UI_LABELS.chooseLevel.en}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {IMMERSION_LEVELS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setProfile({ immersionLevel: key })}
                className={`${BTN_ROW} glass-panel transition ${
                  profile.immersionLevel === key
                    ? 'border-nozomi-purple ring-1 ring-nozomi-purple/50'
                    : ''
                }`}
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

        <section className="space-y-2">
          <LanguageText text={UI_LABELS.sttEngine} size="sm" />
          <div className="grid grid-cols-2 gap-2">
            {STT_ENGINES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSttEngine(key)
                  setSttEngineState(key)
                }}
                className={`${BTN_ROW} glass-panel transition ${
                  sttEngine === key
                    ? 'border-nozomi-purple ring-1 ring-nozomi-purple/50'
                    : ''
                }`}
              >
                <LanguageText text={label} size="sm" align="center" passive />
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <LanguageText text={UI_LABELS.speechInputLang} size="sm" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SPEECH_LANG_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSettings({ speechInputLang: key })}
                className={`${BTN_ROW} glass-panel transition ${
                  settings.speechInputLang === key
                    ? 'border-nozomi-purple ring-1 ring-nozomi-purple/50'
                    : ''
                }`}
              >
                <LanguageText text={label} size="sm" align="center" passive />
              </button>
            ))}
          </div>
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
            clearSession()
            navigate('/chat')
          }}
          className={`${BTN_ROW} glass-panel w-full text-left`}
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
          className={`${BTN_ROW} glass-panel w-full text-left`}
        >
          <LanguageText text={UI_LABELS.words} size="sm" passive />
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
    <label className="glass-panel flex min-h-[48px] cursor-pointer touch-manipulation items-center justify-between gap-4 p-4">
          <LanguageText text={label} size="sm" passive />
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-purple-500"
      />
    </label>
  )
}
