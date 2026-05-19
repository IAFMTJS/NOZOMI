/** Honest voice-model boot phases — no scripted percentage creep. */
export type VoiceBootLoadPhase =
  | 'checking_cache'
  | 'downloading_weights'
  | 'building_engine'
  | 'ready'

export type VoiceBootLoadStatus = {
  phase: VoiceBootLoadPhase
  /** Set only while `phase === 'downloading_weights'` (real HF aggregate). */
  downloadPercent: number | null
}

export function voiceBootStatusLabel(status: VoiceBootLoadStatus): {
  jp: string
  romaji: string
  en: string
} {
  const pct = status.downloadPercent
  switch (status.phase) {
    case 'checking_cache':
      return {
        jp: '音声モデルを確認中…',
        romaji: 'Onsei moderu wo kakunin chuu…',
        en: 'Checking speech model cache…',
      }
    case 'downloading_weights':
      return {
        jp: pct != null ? `音声モデルを取得中… ${pct}%` : '音声モデルを取得中…',
        romaji: 'Onsei moderu wo shutoku chuu…',
        en: pct != null ? `Downloading speech model… ${pct}%` : 'Downloading speech model…',
      }
    case 'building_engine':
      return {
        jp: '音声エンジンを起動中…',
        romaji: 'Onsei enjin wo kidou chuu…',
        en: 'Starting speech engine…',
      }
    case 'ready':
      return {
        jp: '準備完了',
        romaji: 'Junbi kanryou',
        en: 'Ready',
      }
  }
}

export const INITIAL_VOICE_BOOT_STATUS: VoiceBootLoadStatus = {
  phase: 'checking_cache',
  downloadPercent: null,
}
