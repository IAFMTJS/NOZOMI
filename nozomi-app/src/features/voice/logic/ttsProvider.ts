import { speakJapaneseBrowser, stopSpeakingBrowser } from '@/features/voice/logic/ttsBrowser'
import { speakJapaneseCloud, stopCloudTts } from '@/features/voice/logic/ttsCloud'
import { isAnyTtsOutputActive } from '@/features/voice/logic/ttsOutputState'
import type { AppSettings } from '@/types/domain'

export type TtsSpeakOptions = {
  rate?: number
  pitch?: number
  voiceUri?: string
  onStart?: () => void
  onEnd?: () => void
}

export function speakWithProvider(
  text: string,
  settings: Pick<AppSettings, 'ttsProvider' | 'cloudTtsApiKey' | 'voiceRate' | 'voicePitch' | 'voiceUri'>,
  opts: TtsSpeakOptions = {},
): void {
  const merged = {
    rate: opts.rate ?? settings.voiceRate,
    pitch: opts.pitch ?? settings.voicePitch,
    voiceUri: opts.voiceUri ?? settings.voiceUri,
    onStart: opts.onStart,
    onEnd: opts.onEnd,
  }
  if (settings.ttsProvider === 'cloud' && settings.cloudTtsApiKey?.trim()) {
    speakJapaneseCloud(text, settings.cloudTtsApiKey.trim(), merged)
    return
  }
  speakJapaneseBrowser(text, merged)
}

export function stopTtsProvider(): void {
  stopCloudTts()
  stopSpeakingBrowser()
}

export function isTtsOutputActive(): boolean {
  return isAnyTtsOutputActive()
}
