import { useCallback } from 'react'
import { useNozomiStore } from '@/store/useNozomiStore'
import {
  createOpeningTurn,
  createScenarioOpening,
  processUserMessage,
} from '@/systems/conversation/engine'
import { advanceStory } from '@/systems/conversation/storyRunner'
import {
  speakJapanese,
  stopSpeaking,
} from '@/systems/speech/speechService'
import { prepareVoiceInput } from '@/systems/speech/prepareVoiceInput'
import { formatUserMessageTextAsync } from '@/utils/formatUserInput'
import type { ChatMessage, ScenarioCategory, StorySession } from '@/types/domain'

type ConversationSurface = 'chat' | 'voice'

type SendUserMessageOptions = {
  /** Hint from a pinned voice suggestion (not shown as a user message) */
  suggestionHint?: string
}

function msgId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function storyFromSession(
  session: import('@/types/domain').SessionState,
): StorySession | null {
  if (
    session.activeStoryId == null ||
    session.activeStoryBeat == null ||
    session.activeStoryTotalBeats == null
  ) {
    return null
  }
  return {
    storyId: session.activeStoryId,
    slug: session.activeStorySlug ?? '',
    beatOrder: session.activeStoryBeat,
    totalBeats: session.activeStoryTotalBeats,
  }
}

export function useConversation() {
  const profile = useNozomiStore((s) => s.profile)
  const settings = useNozomiStore((s) => s.settings)
  const chatSession = useNozomiStore((s) => s.chatSession)
  const addChatMessage = useNozomiStore((s) => s.addChatMessage)
  const addVoiceMessage = useNozomiStore((s) => s.addVoiceMessage)
  const setSuggestions = useNozomiStore((s) => s.setSuggestions)
  const pushContext = useNozomiStore((s) => s.pushContext)
  const setOrbState = useNozomiStore((s) => s.setOrbState)
  const setSessionTopic = useNozomiStore((s) => s.setSessionTopic)
  const setStorySession = useNozomiStore((s) => s.setStorySession)

  const deliverNozomi = useCallback(
    (
      text: import('@/types/domain').LanguageText,
      topic?: string,
      meta?: { grammarTags?: string; sentenceId?: number },
      surface: ConversationSurface = 'chat',
    ) => {
      const message: ChatMessage = {
        id: msgId(),
        role: 'nozomi',
        text,
        timestamp: Date.now(),
        grammarTags: meta?.grammarTags,
        sentenceId: meta?.sentenceId,
      }
      if (surface === 'voice') addVoiceMessage(message)
      else addChatMessage(message)
      pushContext(surface, { role: 'nozomi', content: text.jp, topic })
      if (topic) setSessionTopic(surface, topic)

      const shouldSpeak =
        surface === 'voice' ? true : settings.voiceEnabled
      if (shouldSpeak) {
        setOrbState('speaking')
        speakJapanese(text.jp, {
          rate: settings.voiceRate,
          pitch: settings.voicePitch,
          onEnd: () => setOrbState('idle'),
        })
      } else {
        setOrbState('idle')
      }
    },
    [
      addChatMessage,
      addVoiceMessage,
      pushContext,
      setOrbState,
      setSessionTopic,
      settings.voiceEnabled,
      settings.voiceRate,
      settings.voicePitch,
    ],
  )

  const applyResponse = useCallback(
    (
      response: import('@/types/domain').EngineResponse,
      surface: ConversationSurface = 'chat',
    ) => {
      if (response.story) {
        setStorySession(surface, response.story)
      }
      setSuggestions(
        surface,
        settings.focusMode
          ? response.suggestions.slice(0, 2)
          : response.suggestions.slice(0, settings.suggestionCount),
      )
      deliverNozomi(response.message, response.topic, {
        grammarTags: response.grammarTags,
        sentenceId: response.sentenceId,
      }, surface)
    },
    [
      deliverNozomi,
      setStorySession,
      setSuggestions,
      settings.focusMode,
      settings.suggestionCount,
    ],
  )

  const sendUserMessage = useCallback(
    async (
      raw: string,
      surface: ConversationSurface = 'chat',
      opts?: SendUserMessageOptions,
    ) => {
      const input = raw.trim()
      if (!input) return

      const prepared =
        surface === 'voice' ? prepareVoiceInput(input) : null
      const displayInput = prepared?.display ?? input
      const engineInput = prepared?.engine ?? input

      const stateAtSend = useNozomiStore.getState()
      const suggestionHint =
        opts?.suggestionHint ??
        (surface === 'voice'
          ? stateAtSend.voicePinnedSuggestion?.jp
          : undefined)
      if (surface === 'voice' && suggestionHint) {
        stateAtSend.setVoicePinnedSuggestion(null)
      }

      stopSpeaking()
      setOrbState('thinking')

      const userText = await formatUserMessageTextAsync(displayInput).catch(() => ({
        jp: displayInput,
        romaji: '',
        en: displayInput,
      }))
      const userMessage: ChatMessage = {
        id: msgId(),
        role: 'user',
        text: userText,
        timestamp: Date.now(),
      }
      if (surface === 'voice') addVoiceMessage(userMessage)
      else addChatMessage(userMessage)
      pushContext(surface, { role: 'user', content: engineInput })

      const state = useNozomiStore.getState()
      const session = surface === 'voice' ? state.voiceSession : state.chatSession
      const contextBuffer =
        surface === 'voice' ? state.voiceContextBuffer : state.chatContextBuffer
      const forcedTopic = session.activeScenario ?? session.topicStack[0]
      const activeStory = storyFromSession(session)

      try {
        if (activeStory) {
          const advanced = await advanceStory(activeStory, profile, forcedTopic)
          if (advanced) {
            applyResponse(advanced.response, surface)
            return
          }
        }

        const response = await processUserMessage(
          engineInput,
          profile,
          contextBuffer,
          forcedTopic,
          {
            ...(suggestionHint ? { suggestionHint } : {}),
            voice: surface === 'voice',
          },
        )
        applyResponse(response, surface)
      } catch {
        applyResponse(
          {
            message: {
              jp: 'うまく聞き取れなかったかも。もう一度言ってくれる？',
              romaji: 'Umaku kikitorenakatta kamo. Mou ichido itte kureru?',
              en: 'I may have missed that. Could you say it once more?',
            },
            suggestions: [],
            topic: forcedTopic ?? 'daily',
            intent: 'help',
          },
          surface,
        )
      }
    },
    [
      addChatMessage,
      addVoiceMessage,
      applyResponse,
      profile,
      pushContext,
      setOrbState,
    ],
  )

  const startConversation = useCallback(async () => {
    const topic = chatSession.topicStack[0] ?? 'daily'
    const opening = await createOpeningTurn(profile, topic)
    applyResponse(opening, 'chat')
  }, [applyResponse, profile, chatSession.topicStack])

  const startVoiceConversation = useCallback(async () => {
    const state = useNozomiStore.getState()
    if (state.voiceMessages.length > 0) return
    const topic = state.voiceSession.topicStack[0] ?? 'daily'
    setOrbState('thinking')
    const opening = await createOpeningTurn(profile, topic)
    applyResponse(opening, 'voice')
  }, [applyResponse, profile, setOrbState])

  const startScenarioConversation = useCallback(
    async (category: ScenarioCategory) => {
      setOrbState('thinking')
      const opening = await createScenarioOpening(profile, category)
      applyResponse(opening, 'chat')
    },
    [applyResponse, profile, setOrbState],
  )

  return {
    sendUserMessage,
    startConversation,
    startVoiceConversation,
    startScenarioConversation,
    deliverNozomi,
  }
}
