import { speakJapaneseBrowser } from '@/features/voice/logic/ttsBrowser'
import { syncSpeechOutputPresence } from '@/features/voice/logic/speechPresenceSync'
import { notifySpeechOutputEnded } from '@/features/voice/logic/voiceSessionContinuity'
import { markVoiceSpan } from '@/features/voice/logic/voiceTurnMetrics'
import { voiceDebugWarn } from '@/features/voice/logic/voiceDebug'
import {
  registerCloudTtsAudio,
  setCloudTtsPlaying,
} from '@/features/voice/logic/ttsOutputState'
import { markTtsOutputStarted, resetTtsOutputTiming } from '@/features/voice/logic/voiceTurnBridge'
import type { TtsSpeakOptions } from '@/features/voice/logic/ttsProvider'

let cloudGen = 0

/** Cloud neural TTS (OpenAI). Falls back to browser TTS on failure. */
export function speakJapaneseCloud(
  text: string,
  apiKey: string,
  opts: TtsSpeakOptions = {},
): void {
  const gen = ++cloudGen
  void (async () => {
    try {
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini-tts',
          voice: 'shimmer',
          input: text.slice(0, 4096),
          response_format: 'mp3',
        }),
      })
      if (!res.ok) throw new Error(`cloud-tts-${res.status}`)
      if (gen !== cloudGen) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      registerCloudTtsAudio(audio)
      markVoiceSpan('tts_start')
      markTtsOutputStarted()
      setCloudTtsPlaying(true)
      syncSpeechOutputPresence(true)
      opts.onStart?.()
      await audio.play()
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(url)
          resolve()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error('cloud-tts-playback'))
        }
      })
      if (gen !== cloudGen) return
      setCloudTtsPlaying(false)
      registerCloudTtsAudio(null)
      resetTtsOutputTiming()
      syncSpeechOutputPresence(false)
      markVoiceSpan('tts_end')
      notifySpeechOutputEnded()
      opts.onEnd?.()
    } catch (err) {
      if (gen !== cloudGen) return
      setCloudTtsPlaying(false)
      registerCloudTtsAudio(null)
      voiceDebugWarn('tts:cloud-fallback', {
        error: err instanceof Error ? err.message : String(err),
      })
      speakJapaneseBrowser(text, opts)
    }
  })()
}

export function stopCloudTts(): void {
  cloudGen += 1
  setCloudTtsPlaying(false)
  registerCloudTtsAudio(null)
  resetTtsOutputTiming()
}
