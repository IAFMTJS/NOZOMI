import type { AppSettings, ListenEndMode, VoiceListenMode } from '@/types/domain'

/** Whether silence-based auto stop should run for this session. */
export function shouldAutoStopListening(settings: AppSettings): boolean {
  if (settings.listenEndMode === 'tap') {
    return (
      settings.voiceListenMode === 'auto_stop' ||
      settings.voiceListenMode === 'continuous'
    )
  }
  if (settings.listenEndMode === 'auto' || settings.listenEndMode === 'auto_with_tap') {
    return true
  }
  return false
}

export function allowsTapToStopListening(settings: AppSettings): boolean {
  if (settings.listenEndMode === 'auto') return false
  if (settings.listenEndMode === 'auto_with_tap') return true
  if (settings.listenEndMode === 'tap') {
    return settings.voiceListenMode !== 'auto_stop'
  }
  return true
}

export function shouldKeepMicWarmOnListenPage(settings: AppSettings): boolean {
  return settings.voiceListenMode === 'continuous'
}

export function isContinuousListenMode(settings: AppSettings): boolean {
  return settings.voiceListenMode === 'continuous'
}

export function resolveListenEndMode(settings: AppSettings): ListenEndMode {
  return settings.listenEndMode
}

export function resolveVoiceListenMode(settings: AppSettings): VoiceListenMode {
  return settings.voiceListenMode
}
