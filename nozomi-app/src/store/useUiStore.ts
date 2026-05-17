import { create } from 'zustand'
import type { OrbState, SpeechState, VocabEntry } from '@/types/domain'

/** Ephemeral UI — not persisted (avoids localStorage writes during orb/mic animation). */
interface UiState {
  orbState: OrbState
  speechState: SpeechState
  audioLevel: number
  liveTranscript: string
  dataReady: boolean
  activeVocab: VocabEntry | null
  setOrbState: (s: OrbState) => void
  setSpeechState: (s: SpeechState) => void
  setAudioLevel: (n: number) => void
  setLiveTranscript: (text: string) => void
  setDataReady: (v: boolean) => void
  setActiveVocab: (v: VocabEntry | null) => void
  clearActiveVocab: () => void
  resetVoiceUi: () => void
}

export const useUiStore = create<UiState>()((set) => ({
  orbState: 'idle',
  speechState: 'idle',
  audioLevel: 0,
  liveTranscript: '',
  dataReady: false,
  activeVocab: null,
  setOrbState: (orbState) => set({ orbState }),
  setSpeechState: (speechState) => set({ speechState }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
  setDataReady: (dataReady) => set({ dataReady }),
  setActiveVocab: (activeVocab) => set({ activeVocab }),
  clearActiveVocab: () => set({ activeVocab: null }),
  resetVoiceUi: () =>
    set({
      orbState: 'idle',
      speechState: 'idle',
      audioLevel: 0,
      liveTranscript: '',
    }),
}))
