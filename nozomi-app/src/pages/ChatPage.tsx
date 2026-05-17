import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/ui/AppHeader'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { SuggestionPills } from '@/components/suggestions/SuggestionPills'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useConversation } from '@/hooks/useConversation'
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
  const dataReady = useNozomiStore((s) => s.dataReady)
  const session = useNozomiStore((s) => s.chatSession)
  const { sendUserMessage, startConversation, startScenarioConversation } =
    useConversation()
  const handleWordTap = useWordTap()
  const bottomRef = useRef<HTMLDivElement>(null)
  const bootedRef = useRef(false)

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
      void startScenarioConversation(scenario)
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
    <div className="app-page">
      <AppHeader showBack onSettings={() => navigate('/settings')} />
      {session.activeStoryId != null &&
        session.activeStoryBeat != null &&
        session.activeStoryTotalBeats != null && (
          <div className="mx-4 mb-1 flex shrink-0 items-center justify-between gap-2 rounded-full border border-nozomi-purple/30 bg-purple-950/30 px-3 py-1.5 text-xs text-nozomi-muted">
            <LanguageText text={UI_LABELS.storyProgress} size="sm" />
            <span>
              {session.activeStoryBeat} / {session.activeStoryTotalBeats}
            </span>
          </div>
        )}
      <div className="app-page-scroll py-4 space-y-4">
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
