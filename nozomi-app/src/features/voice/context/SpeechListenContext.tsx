import { createContext, useContext, type ReactNode } from 'react'
import type { SpeechListenApi } from '@/features/voice/context/speech-listen/types'
import { useSpeechListenController } from '@/features/voice/context/speech-listen/useSpeechListenController'

export type { SpeechListenApi } from '@/features/voice/context/speech-listen/types'

const SpeechListenContext = createContext<SpeechListenApi | null>(null)

export function SpeechListenProvider({ children }: { children: ReactNode }) {
  const api = useSpeechListenController()
  return (
    <SpeechListenContext.Provider value={api}>{children}</SpeechListenContext.Provider>
  )
}

export function useSpeechListen(): SpeechListenApi {
  const ctx = useContext(SpeechListenContext)
  if (!ctx) {
    throw new Error('useSpeechListen must be used within SpeechListenProvider')
  }
  return ctx
}
