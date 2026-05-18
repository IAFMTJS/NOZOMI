import { useCallback, useRef } from 'react'
import { detectIntent } from '@/systems/conversation/nlu'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'
import {
  createOpeningTurn,
  createScenarioOpening,
  createStoryOpening,
  createStoryOpeningForId,
  processUserMessage,
} from '@/systems/conversation'
import { advanceStory } from '@/systems/conversation/storyRunner'
import {
  speakJapanese,
  stopSpeaking,
} from '@/features/voice/logic/speechService'
import { prepareVoiceInput } from '@/features/voice/logic/prepareVoiceInput'
import { requestCloudLlmReply } from '@/features/voice/logic/labs/cloudLlm'
import { markVoiceSpan } from '@/features/voice/logic/voiceTurnMetrics'
import { enterVoiceUnderstanding } from '@/features/voice/logic/voiceTurnCoordinator'
import { trimForVoiceReply } from '@/systems/conversation/voiceReplyTrim'
import { formatUserMessageTextAsync } from '@/utils/formatUserInput'
import type { ChatMessage, ScenarioCategory, StorySession } from '@/types/domain'

type ConversationSurface = 'chat' | 'voice'

type SendUserMessageOptions = {
  /** Hint from a pinned voice suggestion (not shown as a user message) */
  suggestionHint?: string
  /** When true, skip applying Nozomi's reply (e.g. voice turn timed out). */
  shouldAbort?: () => boolean
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
  const chatTurnGenRef = useRef(0)
  const suggestionTimerRef = useRef<number | null>(null)

  const profile = useNozomiStore((s) => s.profile)
  const settings = useNozomiStore((s) => s.settings)
  const chatSession = useNozomiStore((s) => s.chatSession)
  const addChatMessage = useNozomiStore((s) => s.addChatMessage)
  const addVoiceMessage = useNozomiStore((s) => s.addVoiceMessage)
  const setSuggestions = useNozomiStore((s) => s.setSuggestions)
  const pushContext = useNozomiStore((s) => s.pushContext)
  const setOrbState = useUiStore((s) => s.setOrbState)
  const setSpeechState = useUiStore((s) => s.setSpeechState)
  const setSessionTopic = useNozomiStore((s) => s.setSessionTopic)
  const setStorySession = useNozomiStore((s) => s.setStorySession)
  const setSettings = useNozomiStore((s) => s.setSettings)

  const deliverNozomi = useCallback(
    (
      text: import('@/types/domain').LanguageText,
      topic?: string,
      meta?: { grammarTags?: string; sentenceId?: number },
      surface: ConversationSurface = 'chat',
    ) => {
      const spoken =
        surface === 'voice' ? trimForVoiceReply(text) : text
      const message: ChatMessage = {
        id: msgId(),
        role: 'nozomi',
        text: spoken,
        timestamp: Date.now(),
        grammarTags: meta?.grammarTags,
        sentenceId: meta?.sentenceId,
      }
      if (surface === 'voice') addVoiceMessage(message)
      else addChatMessage(message)
      pushContext(surface, { role: 'nozomi', content: spoken.jp, topic })
      if (topic) setSessionTopic(surface, topic)

      const shouldSpeak =
        surface === 'voice' ? true : settings.voiceEnabled
      if (shouldSpeak) {
        speakJapanese(spoken.jp, {
          rate: settings.voiceRate,
          pitch: settings.voicePitch,
          voiceUri: settings.voiceUri,
        })
      } else {
        setOrbState('idle')
        setSpeechState('idle')
      }
    },
    [
      addChatMessage,
      addVoiceMessage,
      pushContext,
      setOrbState,
      setSpeechState,
      setSessionTopic,
      settings.voiceEnabled,
      settings.voiceRate,
      settings.voicePitch,
      settings.voiceUri,
    ],
  )

  const clearSuggestionTimer = useCallback(() => {
    if (suggestionTimerRef.current) {
      clearTimeout(suggestionTimerRef.current)
      suggestionTimerRef.current = null
    }
  }, [])

  const applyResponse = useCallback(
    (
      response: import('@/types/domain').EngineResponse,
      surface: ConversationSurface = 'chat',
    ) => {
      clearSuggestionTimer()
      if (response.story) {
        setStorySession(surface, response.story)
      }
      const suggestions = settings.focusMode
        ? []
        : response.suggestions.slice(0, settings.suggestionCount)
      const showSuggestions = () => setSuggestions(surface, suggestions)
      if (settings.focusMode || suggestions.length === 0) {
        showSuggestions()
      } else {
        suggestionTimerRef.current = window.setTimeout(showSuggestions, 280)
      }
      deliverNozomi(response.message, response.topic, {
        grammarTags: response.grammarTags,
        sentenceId: response.sentenceId,
      }, surface)
    },
    [
      clearSuggestionTimer,
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
      if (surface === 'voice') enterVoiceUnderstanding()

      clearSuggestionTimer()
      const chatTurnId =
        surface === 'chat' ? ++chatTurnGenRef.current : 0

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
      const userIntent = detectIntent(engineInput)

      const chatTurnStale = () =>
        surface === 'chat' && chatTurnGenRef.current !== chatTurnId

      try {
        if (
          activeStory &&
          userIntent !== 'farewell' &&
          userIntent !== 'help'
        ) {
          const advanced = await advanceStory(
            activeStory,
            profile,
            forcedTopic,
            settings,
          )
          if (advanced) {
            if (advanced.story === null) {
              setStorySession(surface, null)
              if (surface === 'voice' && settings.voiceStoryMode) {
                setSettings({ voiceStoryMode: false })
              }
            }
            if (!opts?.shouldAbort?.() && !chatTurnStale()) {
              applyResponse(advanced.response, surface)
            }
            return
          }
        } else if (
          activeStory &&
          (userIntent === 'farewell' || userIntent === 'help')
        ) {
          setStorySession(surface, null)
          if (surface === 'voice' && settings.voiceStoryMode) {
            setSettings({ voiceStoryMode: false })
          }
        }

        if (surface === 'voice') markVoiceSpan('engine_start')
        let response: import('@/types/domain').EngineResponse | null = null
        const useCloudLlm =
          settings.labsCloudLlm &&
          settings.cloudLlmApiKey.trim() &&
          !activeStory &&
          !session.activeScenario
        if (useCloudLlm) {
          response = await requestCloudLlmReply({
            apiKey: settings.cloudLlmApiKey,
            userMessage: engineInput,
            profile,
            context: contextBuffer,
          })
        }
        if (!response) {
          response = await processUserMessage(
            engineInput,
            profile,
            contextBuffer,
            forcedTopic,
            {
              ...(suggestionHint ? { suggestionHint } : {}),
              voice: surface === 'voice',
              settings,
            },
          )
        }
        if (surface === 'voice') markVoiceSpan('engine_done')
        if (!opts?.shouldAbort?.() && !chatTurnStale()) {
          applyResponse(response, surface)
        }
      } catch {
        if (opts?.shouldAbort?.() || chatTurnStale()) return
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
      clearSuggestionTimer,
      profile,
      pushContext,
      setOrbState,
      setSettings,
      setStorySession,
      settings.voiceStoryMode,
    ],
  )

  const startConversation = useCallback(async () => {
    const topic = chatSession.topicStack[0] ?? 'daily'
    const opening = await createOpeningTurn(profile, topic, settings)
    applyResponse(opening, 'chat')
  }, [applyResponse, profile, chatSession.topicStack, settings])

  const startVoiceConversation = useCallback(async () => {
    const state = useNozomiStore.getState()
    if (state.voiceMessages.length > 0) return
    const topic = state.voiceSession.topicStack[0] ?? 'daily'
    setOrbState('thinking')
    const opening = state.settings.voiceStoryMode
      ? await createStoryOpening(profile, topic, state.settings)
      : await createOpeningTurn(profile, topic, state.settings)
    applyResponse(opening, 'voice')
  }, [applyResponse, profile, setOrbState])

  const setVoiceStoryMode = useCallback(
    async (enabled: boolean) => {
      setSettings({ voiceStoryMode: enabled })
      if (!enabled) {
        setStorySession('voice', null)
        return
      }

      const state = useNozomiStore.getState()
      if (state.voiceSession.activeStoryId != null) return

      const topic = state.voiceSession.topicStack[0] ?? 'daily'
      setOrbState('thinking')
      stopSpeaking()
      const opening = await createStoryOpening(profile, topic, state.settings)
      if (opening.story) {
        applyResponse(opening, 'voice')
      } else {
        setSettings({ voiceStoryMode: false })
        setOrbState('idle')
      }
    },
    [applyResponse, profile, setOrbState, setSettings, setStorySession],
  )

  const startScenarioConversation = useCallback(
    async (category: ScenarioCategory, surface: ConversationSurface = 'voice') => {
      setOrbState('thinking')
      const opening = await createScenarioOpening(profile, category, settings)
      applyResponse(opening, surface)
    },
    [applyResponse, profile, setOrbState, settings],
  )

  const startStoryConversation = useCallback(
    async (storyId: number, surface: ConversationSurface = 'voice') => {
      useNozomiStore.setState({
        voiceMessages: [],
        voiceContextBuffer: [],
        voiceSuggestions: [],
        voicePinnedSuggestion: null,
        voiceSession: {
          activeIntent: 'free_chat',
          topicStack: ['daily'],
          turnCount: 0,
        },
      })
      setSettings({ voiceStoryMode: true })
      setOrbState('thinking')
      stopSpeaking()
      const opening = await createStoryOpeningForId(profile, storyId, settings)
      if (opening) {
        applyResponse(opening, surface)
      } else {
        setOrbState('idle')
        setSettings({ voiceStoryMode: false })
      }
    },
    [applyResponse, profile, setOrbState, setSettings],
  )

  return {
    sendUserMessage,
    startConversation,
    startVoiceConversation,
    startScenarioConversation,
    startStoryConversation,
    setVoiceStoryMode,
    deliverNozomi,
  }
}
