import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppSettings,
  ChatMessage,
  ConversationTurn,
  OrbState,
  ScenarioCategory,
  SessionState,
  SpeechState,
  StorySession,
  UserProfile,
  VocabEntry,
} from '@/types/domain'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '@/types/domain'

interface NozomiState {
  profile: UserProfile
  settings: AppSettings
  orbState: OrbState
  speechState: SpeechState
  chatSession: SessionState
  voiceSession: SessionState
  chatMessages: ChatMessage[]
  voiceMessages: ChatMessage[]
  chatContextBuffer: ConversationTurn[]
  voiceContextBuffer: ConversationTurn[]
  chatSuggestions: import('@/types/domain').Suggestion[]
  voiceSuggestions: import('@/types/domain').Suggestion[]
  /** Voice-mode hint only — not posted as a user chat message */
  voicePinnedSuggestion: import('@/types/domain').Suggestion | null
  audioLevel: number
  liveTranscript: string
  dataReady: boolean
  activeVocab: VocabEntry | null
  setProfile: (p: Partial<UserProfile>) => void
  setSettings: (s: Partial<AppSettings>) => void
  setOrbState: (s: OrbState) => void
  setSpeechState: (s: SpeechState) => void
  setAudioLevel: (n: number) => void
  setLiveTranscript: (text: string) => void
  setDataReady: (v: boolean) => void
  addChatMessage: (m: ChatMessage) => void
  addVoiceMessage: (m: ChatMessage) => void
  setSuggestions: (
    surface: 'chat' | 'voice',
    s: import('@/types/domain').Suggestion[],
  ) => void
  setVoicePinnedSuggestion: (
    s: import('@/types/domain').Suggestion | null,
  ) => void
  pushContext: (surface: 'chat' | 'voice', t: ConversationTurn) => void
  clearSession: () => void
  setActiveVocab: (v: VocabEntry | null) => void
  clearActiveVocab: () => void
  setSessionTopic: (surface: 'chat' | 'voice', topic: string) => void
  startScenario: (category: ScenarioCategory) => void
  setStorySession: (surface: 'chat' | 'voice', story: StorySession | null) => void
  toggleFavoriteVocab: (id: number) => void
}

function defaultSession(): SessionState {
  return {
    activeIntent: 'free_chat',
    topicStack: ['daily'],
    turnCount: 0,
  }
}

function mergeProfile(
  current: UserProfile,
  persisted?: Partial<UserProfile>,
): UserProfile {
  if (!persisted) return current
  return {
    ...current,
    ...persisted,
    onboardingComplete: persisted.onboardingComplete ?? current.onboardingComplete,
  }
}

export const useNozomiStore = create<NozomiState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,
      settings: DEFAULT_SETTINGS,
      orbState: 'idle',
      speechState: 'idle',
      chatSession: defaultSession(),
      voiceSession: defaultSession(),
      chatMessages: [],
      voiceMessages: [],
      chatContextBuffer: [],
      voiceContextBuffer: [],
      chatSuggestions: [],
      voiceSuggestions: [],
      voicePinnedSuggestion: null,
      audioLevel: 0,
      liveTranscript: '',
      dataReady: false,
      activeVocab: null,
      setProfile: (p) =>
        set((s) => ({ profile: { ...s.profile, ...p } })),
      setSettings: (s) =>
        set((st) => ({ settings: { ...st.settings, ...s } })),
      setOrbState: (orbState) => set({ orbState }),
      setSpeechState: (speechState) => set({ speechState }),
      setAudioLevel: (audioLevel) => set({ audioLevel }),
      setLiveTranscript: (liveTranscript) => set({ liveTranscript }),
      setDataReady: (dataReady) => set({ dataReady }),
      addChatMessage: (m) =>
        set((s) => ({ chatMessages: [...s.chatMessages, m] })),
      addVoiceMessage: (m) =>
        set((s) => ({ voiceMessages: [...s.voiceMessages, m] })),
      setSuggestions: (surface, suggestions) =>
        set(
          surface === 'voice'
            ? { voiceSuggestions: suggestions, voicePinnedSuggestion: null }
            : { chatSuggestions: suggestions },
        ),
      setVoicePinnedSuggestion: (voicePinnedSuggestion) =>
        set({ voicePinnedSuggestion }),
      pushContext: (surface, t) =>
        set((s) => ({
          ...(surface === 'voice'
            ? {
                voiceContextBuffer: [...s.voiceContextBuffer, t].slice(-12),
                voiceSession: {
                  ...s.voiceSession,
                  turnCount: s.voiceSession.turnCount + 1,
                  topicStack: t.topic
                    ? [...new Set([...s.voiceSession.topicStack, t.topic])].slice(-5)
                    : s.voiceSession.topicStack,
                },
              }
            : {
                chatContextBuffer: [...s.chatContextBuffer, t].slice(-12),
                chatSession: {
                  ...s.chatSession,
                  turnCount: s.chatSession.turnCount + 1,
                  topicStack: t.topic
                    ? [...new Set([...s.chatSession.topicStack, t.topic])].slice(-5)
                    : s.chatSession.topicStack,
                },
              }),
        })),
      clearSession: () =>
        set({
          chatMessages: [],
          voiceMessages: [],
          chatContextBuffer: [],
          voiceContextBuffer: [],
          chatSuggestions: [],
          voiceSuggestions: [],
          voicePinnedSuggestion: null,
          chatSession: defaultSession(),
          voiceSession: defaultSession(),
          orbState: 'idle',
          speechState: 'idle',
          liveTranscript: '',
          audioLevel: 0,
        }),
      setActiveVocab: (activeVocab) => set({ activeVocab }),
      clearActiveVocab: () => set({ activeVocab: null }),
      setSessionTopic: (surface, topic) =>
        set((s) => ({
          ...(surface === 'voice'
            ? {
                voiceSession: {
                  ...s.voiceSession,
                  topicStack: [...new Set([topic, ...s.voiceSession.topicStack])].slice(
                    0,
                    5,
                  ),
                },
              }
            : {
                chatSession: {
                  ...s.chatSession,
                  topicStack: [...new Set([topic, ...s.chatSession.topicStack])].slice(
                    0,
                    5,
                  ),
                },
              }),
        })),
      startScenario: (category) =>
        set({
          voiceMessages: [],
          voiceContextBuffer: [],
          voiceSuggestions: [],
          voicePinnedSuggestion: null,
          voiceSession: {
            activeIntent: 'scenario',
            activeScenario: category,
            activeStorySlug: undefined,
            activeStoryId: undefined,
            activeStoryBeat: undefined,
            activeStoryTotalBeats: undefined,
            topicStack: [category],
            turnCount: 0,
          },
          orbState: 'idle',
        }),
      setStorySession: (surface, story) =>
        set((s) => ({
          ...(surface === 'voice'
            ? {
                voiceSession: story
                  ? {
                      ...s.voiceSession,
                      activeStoryId: story.storyId,
                      activeStorySlug: story.slug,
                      activeStoryBeat: story.beatOrder,
                      activeStoryTotalBeats: story.totalBeats,
                    }
                  : {
                      ...s.voiceSession,
                      activeStoryId: undefined,
                      activeStorySlug: undefined,
                      activeStoryBeat: undefined,
                      activeStoryTotalBeats: undefined,
                    },
              }
            : {
                chatSession: story
                  ? {
                      ...s.chatSession,
                      activeStoryId: story.storyId,
                      activeStorySlug: story.slug,
                      activeStoryBeat: story.beatOrder,
                      activeStoryTotalBeats: story.totalBeats,
                    }
                  : {
                      ...s.chatSession,
                      activeStoryId: undefined,
                      activeStorySlug: undefined,
                      activeStoryBeat: undefined,
                      activeStoryTotalBeats: undefined,
                    },
              }),
        })),
      toggleFavoriteVocab: (id) =>
        set((s) => {
          const fav = s.settings.favoriteVocabIds ?? []
          const next = fav.includes(id)
            ? fav.filter((x) => x !== id)
            : [...fav, id]
          return {
            settings: { ...s.settings, favoriteVocabIds: next },
          }
        }),
    }),
    {
      name: 'nozomi-storage',
      version: 5,
      migrate: (persisted, fromVersion) => {
        const state = persisted as Partial<NozomiState> & {
          profile?: Partial<UserProfile> & { xp?: number; streakDays?: number }
        }
        if (fromVersion < 2 && state.settings?.speechInputLang === 'en-US') {
          state.settings = { ...state.settings, speechInputLang: 'auto' }
        }
        if (fromVersion < 3 && state.profile) {
          state.profile = { ...state.profile, onboardingComplete: true }
        }
        if (fromVersion < 4 && state.settings) {
          state.settings = { ...state.settings, voiceStoryMode: false }
        }
        if (fromVersion < 5 && state.profile) {
          const { xp: _xp, streakDays: _streak, ...profileRest } = state.profile
          state.profile = profileRest as UserProfile
        }
        return state as NozomiState
      },
      partialize: (s) => ({
        profile: s.profile,
        settings: s.settings,
        chatMessages: s.chatMessages.slice(-50),
        voiceMessages: s.voiceMessages.slice(-50),
        chatContextBuffer: s.chatContextBuffer.slice(-12),
        voiceContextBuffer: s.voiceContextBuffer.slice(-12),
        chatSession: s.chatSession,
        voiceSession: s.voiceSession,
        chatSuggestions: s.chatSuggestions,
        voiceSuggestions: s.voiceSuggestions,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<NozomiState> & {
          messages?: ChatMessage[]
          contextBuffer?: ConversationTurn[]
          session?: SessionState
          suggestions?: import('@/types/domain').Suggestion[]
        }
        const migratedChatMessages = p.chatMessages ?? p.messages ?? []
        const migratedChatContext = p.chatContextBuffer ?? p.contextBuffer ?? []
        const migratedChatSession = { ...current.chatSession, ...p.chatSession, ...p.session }
        const migratedChatSuggestions = p.chatSuggestions ?? p.suggestions ?? []
        return {
          ...current,
          ...p,
          profile: mergeProfile(current.profile, p.profile),
          settings: {
            ...DEFAULT_SETTINGS,
            ...(p.settings ?? {}),
          },
          chatMessages: migratedChatMessages,
          voiceMessages: p.voiceMessages ?? current.voiceMessages,
          chatContextBuffer: migratedChatContext,
          voiceContextBuffer: p.voiceContextBuffer ?? current.voiceContextBuffer,
          chatSession: migratedChatSession,
          voiceSession: p.voiceSession ?? current.voiceSession,
          chatSuggestions: migratedChatSuggestions,
          voiceSuggestions: p.voiceSuggestions ?? current.voiceSuggestions,
        }
      },
    },
  ),
)
