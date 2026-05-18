import { useNozomiStore } from '@/store/useNozomiStore'
import {
  isTtsOutputActive,
  speakWithProvider,
  stopTtsProvider,
} from '@/features/voice/logic/ttsProvider'
import { stopCloudTts } from '@/features/voice/logic/ttsCloud'
import { iosPrepareForTts } from '@/features/voice/logic/iosMemoryBudget'
import type { TtsSpeakOptions } from '@/features/voice/logic/ttsProvider'

export function isSpeechOutputActive(): boolean {
  return isTtsOutputActive()
}

export function whenSpeechOutputIdle(maxWaitMs = 5000): Promise<void> {
  if (!isSpeechOutputActive()) return Promise.resolve()
  return new Promise((resolve) => {
    const started = Date.now()
    const poll = () => {
      if (!isSpeechOutputActive() || Date.now() - started >= maxWaitMs) {
        resolve()
        return
      }
      requestAnimationFrame(poll)
    }
    poll()
  })
}

export function micCooldownAfterSpeechMs(): number {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 220 : 0
}

export function speakJapanese(
  text: string,
  opts: {
    rate?: number
    pitch?: number
    voiceUri?: string
    onStart?: () => void
    onEnd?: () => void
  } = {},
): void {
  const settings = useNozomiStore.getState().settings
  void iosPrepareForTts().then(() => {
    speakWithProvider(text, settings, opts as TtsSpeakOptions)
  })
}

export function stopSpeaking(): void {
  stopCloudTts()
  stopTtsProvider()
}
