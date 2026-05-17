import { create } from 'zustand'
import { resetOrbAudioLevel } from '@/features/orb/logic/orbAudioLevel'
import type { OrbState, SpeechState, VocabEntry } from '@/types/domain'

/** Ephemeral UI — not persisted (avoids localStorage writes during orb/mic animation). */
interface UiState {
  orbState: OrbState
  speechState: SpeechState
  audioLevel: number
  liveTranscript: string
  /** True between stop-tap and STT commit (before conversation engine runs). */
  transcriptFinalizing: boolean
  dataReady: boolean
  dataLoadFailed: boolean
  activeVocab: VocabEntry | null
  setOrbState: (s: OrbState) => void
  setSpeechState: (s: SpeechState) => void
  setAudioLevel: (n: number) => void
  setLiveTranscript: (text: string) => void
  setTranscriptFinalizing: (v: boolean) => void
  setDataReady: (v: boolean) => void
  setDataLoadFailed: (v: boolean) => void
  setActiveVocab: (v: VocabEntry | null) => void
  clearActiveVocab: () => void
  resetVoiceUi: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  orbState: 'idle',
  speechState: 'idle',
  audioLevel: 0,
  liveTranscript: '',
  transcriptFinalizing: false,
  dataReady: false,
  dataLoadFailed: false,
  activeVocab: null,
  setOrbState: (orbState) => set({ orbState }),
  setSpeechState: (speechState) => set({ speechState }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
  setTranscriptFinalizing: (transcriptFinalizing) => set({ transcriptFinalizing }),
  setDataReady: (dataReady) => set({ dataReady }),
  setDataLoadFailed: (dataLoadFailed) => set({ dataLoadFailed }),
  setActiveVocab: (activeVocab) => set({ activeVocab }),
  clearActiveVocab: () => set({ activeVocab: null }),
  resetVoiceUi: () => {
    resetOrbAudioLevel()
    set({
      orbState: 'idle',
      speechState: 'idle',
      audioLevel: 0,
      liveTranscript: '',
      transcriptFinalizing: false,
    })
  },
}))
