/** Split long Japanese replies for smoother browser TTS. */

const MAX_CHUNK_LEN = 72

export function chunkJapaneseForTts(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.length <= MAX_CHUNK_LEN) return [trimmed]

  const parts = trimmed.split(/(?<=[。．.！？!?、])\s*/)
  const chunks: string[] = []
  let buf = ''
  for (const part of parts) {
    const next = buf ? `${buf}${part}` : part
    if (next.length > MAX_CHUNK_LEN && buf) {
      chunks.push(buf.trim())
      buf = part
    } else {
      buf = next
    }
  }
  if (buf.trim()) chunks.push(buf.trim())
  return chunks.length ? chunks : [trimmed]
}
