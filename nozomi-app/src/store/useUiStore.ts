import { create } from 'zustand'
import { resetOrbAudioLevel } from '@/features/orb/logic/orbAudioLevel'
import type { VoicePipelineStep } from '@/features/voice/logic/voicePipelineStep'
import type { MobileVoiceBootPhase } from '@/features/voice/logic/mobileVoiceBoot'
import type { OrbState, SpeechState, VocabEntry } from '@/types/domain'

/** Ephemeral UI — not persisted (avoids localStorage writes during orb/mic animation). */
interface UiState {
  orbState: OrbState
  speechState: SpeechState
  audioLevel: number
  liveTranscript: string
  /** True between stop-tap and STT commit (before conversation engine runs). */
  transcriptFinalizing: boolean
  /** Granular pipeline step for status + debug (?voiceDebug). */
  voicePipelineStep: VoicePipelineStep
  dataReady: boolean
  dataLoadFailed: boolean
  voiceBootPhase: MobileVoiceBootPhase
  voiceBootProgress: number | null
  voiceBootError: string | null
  activeVocab: VocabEntry | null
  setOrbState: (s: OrbState) => void
  setSpeechState: (s: SpeechState) => void
  setAudioLevel: (n: number) => void
  setLiveTranscript: (text: string) => void
  setTranscriptFinalizing: (v: boolean) => void
  setVoicePipelineStep: (step: VoicePipelineStep) => void
  setDataReady: (v: boolean) => void
  setDataLoadFailed: (v: boolean) => void
  setVoiceBootPhase: (phase: MobileVoiceBootPhase) => void
  setVoiceBootProgress: (pct: number | null) => void
  setVoiceBootError: (message: string | null) => void
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
  voicePipelineStep: 'idle',
  dataReady: false,
  dataLoadFailed: false,
  voiceBootPhase: 'idle',
  voiceBootProgress: null,
  voiceBootError: null,
  activeVocab: null,
  setOrbState: (orbState) => set({ orbState }),
  setSpeechState: (speechState) => set({ speechState }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
  setTranscriptFinalizing: (transcriptFinalizing) => set({ transcriptFinalizing }),
  setVoicePipelineStep: (voicePipelineStep) => set({ voicePipelineStep }),
  setDataReady: (dataReady) => set({ dataReady }),
  setDataLoadFailed: (dataLoadFailed) => set({ dataLoadFailed }),
  setVoiceBootPhase: (voiceBootPhase) => set({ voiceBootPhase }),
  setVoiceBootProgress: (voiceBootProgress) => set({ voiceBootProgress }),
  setVoiceBootError: (voiceBootError) => set({ voiceBootError }),
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
      voicePipelineStep: 'idle',
    })
  },
}))
