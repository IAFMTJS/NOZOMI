import type { Sentence } from '@/types/domain'

const seenSentenceIds = new Set<number>()
const seenJp = new Set<string>()

export function markSentenceExposure(sentence: Pick<Sentence, 'id' | 'jp'>): void {
  seenSentenceIds.add(sentence.id)
  seenJp.add(sentence.jp)
}

export function filterUnseenSentences(pool: Sentence[]): Sentence[] {
  const fresh = pool.filter(
    (s) => !seenSentenceIds.has(s.id) && !seenJp.has(s.jp),
  )
  return fresh.length ? fresh : pool
}

export function resetExposure(): void {
  seenSentenceIds.clear()
  seenJp.clear()
}
