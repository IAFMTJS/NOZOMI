import { useEffect, useRef, useState } from 'react'
import { LanguageText } from '@/components/language/LanguageText'
import { getListenSignals } from '@/features/voice/logic/speechService'
import {
  resolveSpeechRecognitionLang,
  speechLangDisplayName,
} from '@/features/voice/logic/speechLocale'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'

export function ListeningMicHint() {
  const speechState = useUiStore((s) => s.speechState)
  const liveTranscript = useUiStore((s) => s.liveTranscript)
  const speechLangPref = useNozomiStore((s) => s.settings.speechInputLang)
  const resolvedLang = speechLangDisplayName(
    resolveSpeechRecognitionLang(speechLangPref),
  )
  const listeningSince = useRef(0)
  const [signals, setSignals] = useState(getListenSignals)

  useEffect(() => {
    if (speechState !== 'listening') return
    listeningSince.current = Date.now()
    const id = window.setInterval(() => setSignals(getListenSignals()), 500)
    return () => clearInterval(id)
  }, [speechState])

  if (speechState !== 'listening' || liveTranscript.trim()) return null

  const elapsed = Date.now() - listeningSince.current
  const noVoice =
    signals.audioStart && !signals.soundStart && !signals.speechStart && elapsed > 2500

  if (!noVoice) return null

  const text = {
    jp: `声が検出されていません。マイクに向かって話し、音声入力言語（現在: ${resolvedLang}）を日本語または自動にしてください。`,
    romaji: 'Koe ga kenshutsu sarete imasen.',
    en: `No voice detected yet. Speak clearly into the mic. Speech language in Settings should be Japanese or Auto (now: ${resolvedLang}).`,
  }

  return (
    <div
      className="glass-panel voice-hint-panel px-4 py-2 text-center"
      role="status"
    >
      <LanguageText text={text} size="sm" align="center" />
    </div>
  )
}
