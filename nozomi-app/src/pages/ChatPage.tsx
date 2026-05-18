import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/ui/AppHeader'
import { ChatInput, MessageBubble } from '@/features/chat'
import { useConversation } from '@/features/conversation'
import { SuggestionPills } from '@/features/presence'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'
import { useWordTap } from '@/hooks/useWordTap'
import { UI_LABELS } from '@/data/ui-labels'
import { LanguageText } from '@/components/language/LanguageText'
import type { ScenarioCategory } from '@/types/domain'

type ChatLocationState = {
  scenarioStart?: ScenarioCategory
  pendingMessage?: string
} | null

export function ChatPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const messages = useNozomiStore((s) => s.chatMessages)
  const suggestions = useNozomiStore((s) => s.chatSuggestions)
  const dataReady = useUiStore((s) => s.dataReady)
  const session = useNozomiStore((s) => s.chatSession)
  const { sendUserMessage, startConversation, startScenarioConversation } =
    useConversation()
  const setOrbState = useUiStore((s) => s.setOrbState)
  const handleWordTap = useWordTap()
  const bottomRef = useRef<HTMLDivElement>(null)
  const bootedRef = useRef(false)

  useEffect(() => {
    setOrbState('idle')
    return () => setOrbState('idle')
  }, [setOrbState])

  useEffect(() => {
    if (!dataReady || bootedRef.current) return
    bootedRef.current = true

    const state = location.state as ChatLocationState
    const scenario = state?.scenarioStart
    const pendingMessage = state?.pendingMessage?.trim()

    if (pendingMessage) {
      void sendUserMessage(pendingMessage)
      navigate(location.pathname, { replace: true, state: {} })
      return
    }

    if (scenario) {
      void startScenarioConversation(scenario, 'chat')
      navigate(location.pathname, { replace: true, state: {} })
      return
    }

    if (messages.length === 0) {
      void startConversation()
    }
  }, [
    dataReady,
    location.pathname,
    location.state,
    messages.length,
    navigate,
    sendUserMessage,
    startConversation,
    startScenarioConversation,
  ])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="app-page" data-testid="chat-page">
      <AppHeader showBack onSettings={() => navigate('/settings')} />
      {session.activeStoryId != null &&
        session.activeStoryBeat != null &&
        session.activeStoryTotalBeats != null && (
          <div className="mx-4 mb-1 flex shrink-0 items-center justify-between gap-2 rounded-full border border-nozomi-signal/40 bg-nozomi-signal/10 px-3 py-1.5 text-xs text-nozomi-muted">
            <LanguageText text={UI_LABELS.storyProgress} size="sm" />
            <span>
              {session.activeStoryBeat} / {session.activeStoryTotalBeats}
            </span>
          </div>
        )}
      <div
        className="app-page-scroll py-4 space-y-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && (
          <div className="px-6 py-12 text-center space-y-3">
            <LanguageText text={UI_LABELS.saySomething} align="center" />
            <LanguageText text={UI_LABELS.tapWordHint} size="sm" align="center" />
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onWordTap={handleWordTap} />
        ))}
        <div ref={bottomRef} />
      </div>
      <SuggestionPills
        suggestions={suggestions}
        onSelect={(s) => sendUserMessage(s.jp)}
      />
      <ChatInput onSend={sendUserMessage} />
    </div>
  )
}
