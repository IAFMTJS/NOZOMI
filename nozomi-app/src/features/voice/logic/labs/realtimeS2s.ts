import { voiceDebug } from '@/features/voice/logic/voiceDebug'

/**
 * Phase 7 — OpenAI Realtime / Gemini Live adapter stub.
 * Production use requires ephemeral token endpoint and WebRTC/WS client.
 */
export type RealtimeS2sSession = {
  close: () => void
}

export async function connectRealtimeS2s(_opts: {
  apiKey: string
  onAudioOut: (pcmBase64: string) => void
  onTranscript: (text: string, role: 'user' | 'assistant') => void
}): Promise<RealtimeS2sSession | null> {
  voiceDebug('realtime:stub', { note: 'Enable labsRealtimeS2s and implement WebRTC client' })
  return null
}
