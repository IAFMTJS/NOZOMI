import { voiceDebugWarn } from '@/features/voice/logic/voiceDebug'

/**
 * Optional cloud STT (Deepgram-compatible REST). Returns null when not configured or on error.
 */
export async function transcribeCloudAudio(
  apiKey: string,
  pcmOrBlob: Blob,
  lang: string,
): Promise<string | null> {
  if (!apiKey.trim()) return null
  try {
    const res = await fetch(
      `https://api.deepgram.com/v1/listen?language=${encodeURIComponent(lang)}&model=nova-2`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey.trim()}`,
          'Content-Type': pcmOrBlob.type || 'audio/webm',
        },
        body: pcmOrBlob,
      },
    )
    if (!res.ok) throw new Error(`cloud-stt-${res.status}`)
    const json = (await res.json()) as {
      results?: { channels?: { alternatives?: { transcript?: string }[] }[] }
    }
    const text =
      json.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? ''
    return text || null
  } catch (err) {
    voiceDebugWarn('stt:cloud-failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
