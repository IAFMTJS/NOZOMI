import type { ConversationTurn, EngineResponse, UserProfile } from '@/types/domain'
import { voiceDebugWarn } from '@/features/voice/logic/voiceDebug'

export type CloudLlmRequest = {
  apiKey: string
  userMessage: string
  profile: UserProfile
  context: ConversationTurn[]
}

/**
 * Phase 6 — optional OpenAI chat completion for free-form voice/chat.
 * Returns null → caller uses local engine.
 */
export async function requestCloudLlmReply(
  req: CloudLlmRequest,
): Promise<EngineResponse | null> {
  if (!req.apiKey.trim()) return null
  try {
    const system = `You are Nozomi, a calm Japanese tutor. JLPT level: ${req.profile.jlptLevel}. Reply in Japanese with short, speakable sentences.`
    const messages = [
      { role: 'system' as const, content: system },
      ...req.context.slice(-8).map((t) => ({
        role: t.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: t.content,
      })),
      { role: 'user' as const, content: req.userMessage },
    ]
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${req.apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 180,
      }),
    })
    if (!res.ok) throw new Error(`cloud-llm-${res.status}`)
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const jp = json.choices?.[0]?.message?.content?.trim()
    if (!jp) return null
    return {
      message: { jp, romaji: '', en: '' },
      suggestions: [],
      topic: 'daily',
    }
  } catch (err) {
    voiceDebugWarn('llm:cloud-failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
