import { syncSpeechOutputPresence } from '@/features/voice/logic/speechPresenceSync'
import { notifySpeechOutputEnded } from '@/features/voice/logic/voiceSessionContinuity'
import { markVoiceSpan } from '@/features/voice/logic/voiceTurnMetrics'
import { markTtsOutputStarted, resetTtsOutputTiming } from '@/features/voice/logic/voiceTurnBridge'
import {
  NOZOMI_VOICE_AUTO,
  nozomiSpeechDefaults,
  pickJapaneseVoice,
  warmJapaneseVoices,
} from '@/features/voice/logic/japaneseVoicePicker'
import { chunkJapaneseForTts } from '@/features/voice/logic/ttsChunking'
import type { TtsSpeakOptions } from '@/features/voice/logic/ttsProvider'

let synthUtterance: SpeechSynthesisUtterance | null = null
let speakGeneration = 0
let chunkIndex = 0
let chunkTexts: string[] = []
let chunkOpts: TtsSpeakOptions = {}

function fireEnd(gen: number) {
  if (gen !== speakGeneration) return
  syncSpeechOutputPresence(false)
  resetTtsOutputTiming()
  markVoiceSpan('tts_end')
  notifySpeechOutputEnded()
  chunkOpts.onEnd?.()
}

function speakNextChunk(gen: number) {
  if (gen !== speakGeneration || !('speechSynthesis' in window)) return
  if (chunkIndex >= chunkTexts.length) {
    fireEnd(gen)
    return
  }
  const text = chunkTexts[chunkIndex]
  chunkIndex += 1
  synthUtterance = new SpeechSynthesisUtterance(text)
  synthUtterance.lang = 'ja-JP'
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const defaults = nozomiSpeechDefaults(isMobile)
  synthUtterance.rate = chunkOpts.rate ?? defaults.rate
  synthUtterance.pitch = chunkOpts.pitch ?? defaults.pitch
  const preferredUri = chunkOpts.voiceUri ?? NOZOMI_VOICE_AUTO

  synthUtterance.onstart = () => {
    if (gen !== speakGeneration) return
    if (chunkIndex === 1) {
      markVoiceSpan('tts_start')
      markTtsOutputStarted()
      syncSpeechOutputPresence(true)
      chunkOpts.onStart?.()
    }
  }
  synthUtterance.onend = () => speakNextChunk(gen)
  synthUtterance.onerror = () => speakNextChunk(gen)

  const voice = pickJapaneseVoice(preferredUri)
  if (voice) synthUtterance.voice = voice
  window.speechSynthesis.speak(synthUtterance)
}

export function speakJapaneseBrowser(text: string, opts: TtsSpeakOptions = {}): void {
  if (!('speechSynthesis' in window)) return
  speakGeneration += 1
  const gen = speakGeneration
  window.speechSynthesis.cancel()
  chunkTexts = chunkJapaneseForTts(text)
  chunkIndex = 0
  chunkOpts = opts

  if (window.speechSynthesis.getVoices().length === 0) {
    const onVoices = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoices)
      speakNextChunk(gen)
    }
    window.speechSynthesis.addEventListener('voiceschanged', onVoices)
    warmJapaneseVoices()
    return
  }
  speakNextChunk(gen)
}

export function stopSpeakingBrowser(): void {
  speakGeneration += 1
  chunkTexts = []
  chunkIndex = 0
  window.speechSynthesis?.cancel()
  resetTtsOutputTiming()
  syncSpeechOutputPresence(false)
}

export function isBrowserTtsActive(): boolean {
  if (!('speechSynthesis' in window)) return false
  return window.speechSynthesis.speaking || window.speechSynthesis.pending
}
