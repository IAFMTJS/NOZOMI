import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  AppSettings,
  ChatMessage,
  ConversationTurn,
  ScenarioCategory,
  SessionState,
  StorySession,
  UserProfile,
} from '@/types/domain'
import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '@/types/domain'
import { createDebouncedPersistStorage } from '@/store/debouncedPersistStorage'
import { useUiStore } from '@/store/useUiStore'

/** In-memory cap — prevents unbounded growth during long voice sessions on mobile. */
export const MAX_SESSION_MESSAGES = 24

function trimMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.length <= MAX_SESSION_MESSAGES
    ? messages
    : messages.slice(-MAX_SESSION_MESSAGES)
}

interface NozomiState {
  profile: UserProfile
  settings: AppSettings
  chatSession: SessionState
  voiceSession: SessionState
  chatMessages: ChatMessage[]
  voiceMessages: ChatMessage[]
  chatContextBuffer: ConversationTurn[]
  voiceContextBuffer: ConversationTurn[]
  chatSuggestions: import('@/types/domain').Suggestion[]
  voiceSuggestions: import('@/types/domain').Suggestion[]
  voicePinnedSuggestion: import('@/types/domain').Suggestion | null
  setProfile: (p: Partial<UserProfile>) => void
  setSettings: (s: Partial<AppSettings>) => void
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
      chatSession: defaultSession(),
      voiceSession: defaultSession(),
      chatMessages: [],
      voiceMessages: [],
      chatContextBuffer: [],
      voiceContextBuffer: [],
      chatSuggestions: [],
      voiceSuggestions: [],
      voicePinnedSuggestion: null,
      setProfile: (p) =>
        set((s) => ({ profile: { ...s.profile, ...p } })),
      setSettings: (s) =>
        set((st) => ({ settings: { ...st.settings, ...s } })),
      addChatMessage: (m) =>
        set((s) => ({
          chatMessages: trimMessages([...s.chatMessages, m]),
        })),
      addVoiceMessage: (m) =>
        set((s) => ({
          voiceMessages: trimMessages([...s.voiceMessages, m]),
        })),
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
      clearSession: () => {
        useUiStore.getState().resetVoiceUi()
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
        })
      },
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
      startScenario: (category) => {
        useUiStore.getState().setOrbState('idle')
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
        })
      },
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
      version: 7,
      storage: createJSONStorage(() => createDebouncedPersistStorage()),
      onRehydrateStorageError: () => {
        try {
          localStorage.removeItem('nozomi-storage')
        } catch {
          /* ignore */
        }
      },
      migrate: (persisted, fromVersion) => {
        const state = persisted as Record<string, unknown>
        if (fromVersion < 2 && state.settings && typeof state.settings === 'object') {
          const settings = state.settings as AppSettings
          if (settings.speechInputLang === 'en-US') {
            state.settings = { ...settings, speechInputLang: 'auto' }
          }
        }
        // v3 used to force onboardingComplete — do not auto-skip onboarding on upgrade.
        if (fromVersion < 4 && state.settings && typeof state.settings === 'object') {
          state.settings = {
            ...(state.settings as AppSettings),
            voiceStoryMode: false,
          }
        }
        if (fromVersion < 5 && state.profile && typeof state.profile === 'object') {
          const { xp: _xp, streakDays: _streak, ...profileRest } = state.profile as UserProfile & {
            xp?: number
            streakDays?: number
          }
          state.profile = profileRest
        }
        return state
      },
      partialize: (s) => ({
        profile: s.profile,
        settings: s.settings,
        chatSession: s.chatSession,
        voiceSession: s.voiceSession,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<NozomiState> & {
          messages?: ChatMessage[]
          contextBuffer?: ConversationTurn[]
          session?: SessionState
          suggestions?: import('@/types/domain').Suggestion[]
          chatMessages?: ChatMessage[]
          voiceMessages?: ChatMessage[]
        }
        const migratedChatSession = { ...current.chatSession, ...p.chatSession, ...p.session }
        return {
          ...current,
          profile: mergeProfile(current.profile, p.profile),
          settings: {
            ...DEFAULT_SETTINGS,
            ...(p.settings ?? {}),
          },
          chatSession: migratedChatSession,
          voiceSession: p.voiceSession ?? current.voiceSession,
          chatMessages: current.chatMessages,
          voiceMessages: current.voiceMessages,
          chatContextBuffer: current.chatContextBuffer,
          voiceContextBuffer: current.voiceContextBuffer,
          chatSuggestions: current.chatSuggestions,
          voiceSuggestions: current.voiceSuggestions,
        }
      },
    },
  ),
)
