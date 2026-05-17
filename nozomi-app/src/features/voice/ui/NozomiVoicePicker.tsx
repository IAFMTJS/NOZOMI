import { useCallback, useEffect, useState } from 'react'
import { LanguageText } from '@/components/language/LanguageText'
import { UI_LABELS } from '@/data/ui-labels'
import { useNozomiStore } from '@/store/useNozomiStore'
import {
  formatJapaneseVoiceLabel,
  listRankedJapaneseVoices,
  NOZOMI_VOICE_AUTO,
  warmJapaneseVoices,
} from '@/systems/speech/japaneseVoicePicker'
import { speakJapanese, stopSpeaking } from '@/systems/speech/speechService'
const PREVIEW_JP = 'こんにちは。ノゾミです。一緒に練習しましょう。'

export function NozomiVoicePicker() {
  const voiceUri = useNozomiStore((s) => s.settings.voiceUri)
  const voiceRate = useNozomiStore((s) => s.settings.voiceRate)
  const voicePitch = useNozomiStore((s) => s.settings.voicePitch)
  const setSettings = useNozomiStore((s) => s.setSettings)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  const refresh = useCallback(() => {
    setVoices(listRankedJapaneseVoices())
  }, [])

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    refresh()
    warmJapaneseVoices()
    window.speechSynthesis.addEventListener('voiceschanged', refresh)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh)
  }, [refresh])

  const handlePreview = () => {
    stopSpeaking()
    speakJapanese(PREVIEW_JP, {
      voiceUri,
      rate: voiceRate,
      pitch: voicePitch,
    })
  }

  if (!('speechSynthesis' in window)) return null

  return (
    <section className="glass-panel space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <LanguageText text={UI_LABELS.nozomiVoice} size="sm" />
        <button
          type="button"
          onClick={handlePreview}
          className="shrink-0 rounded-lg border border-nozomi-purple/40 px-3 py-1.5 text-xs text-nozomi-purple touch-manipulation active:scale-[0.98]"
        >
          {UI_LABELS.voicePreview.en}
        </button>
      </div>
      <select
        value={voiceUri}
        onChange={(e) => setSettings({ voiceUri: e.target.value })}
        className="w-full rounded-xl border border-white/10 bg-nozomi-bg-elevated px-3 py-3 text-sm text-nozomi-text outline-none focus:border-nozomi-accent/50"
        aria-label={UI_LABELS.nozomiVoice.en}
      >
        <option value={NOZOMI_VOICE_AUTO}>{UI_LABELS.voiceAuto.en}</option>
        {voices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {formatJapaneseVoiceLabel(v)}
          </option>
        ))}
      </select>
      {voices.length === 0 && (
        <p className="text-[10px] leading-snug text-amber-200/90">
          {UI_LABELS.voiceLoading.en} — install a Japanese system voice for better quality.
        </p>
      )}
      {voices.length > 0 && voiceUri === NOZOMI_VOICE_AUTO && (
        <p className="text-[10px] leading-snug text-nozomi-muted">
          {UI_LABELS.voiceAutoHint.en.replace(
            '{name}',
            formatJapaneseVoiceLabel(voices[0]!),
          )}
        </p>
      )}
      <p className="text-[10px] leading-snug text-nozomi-muted">
        <LanguageText text={UI_LABELS.voiceQualityHint} size="sm" passive />
      </p>
    </section>
  )
}
