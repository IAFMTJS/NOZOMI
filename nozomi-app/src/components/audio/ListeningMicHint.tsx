import { useEffect, useRef, useState } from 'react'
import { LanguageText } from '@/components/language/LanguageText'
import { getListenSignals } from '@/systems/speech/speechService'
import {
  resolveSpeechRecognitionLang,
  speechLangDisplayName,
} from '@/systems/speech/speechLocale'
import { useNozomiStore } from '@/store/useNozomiStore'

export function ListeningMicHint() {
  const speechState = useNozomiStore((s) => s.speechState)
  const liveTranscript = useNozomiStore((s) => s.liveTranscript)
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
      className="glass-panel mx-auto w-full max-w-md border border-amber-500/40 px-4 py-2 text-center"
      role="status"
    >
      <LanguageText text={text} size="sm" align="center" />
    </div>
  )
}
