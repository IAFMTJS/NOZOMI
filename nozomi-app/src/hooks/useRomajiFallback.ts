import { useEffect, useState } from 'react'
import { lookupRomajiForJapanese } from '@/utils/romajiLookup'

/** Fill in romaji at display time when the text object has none. */
export function useRomajiFallback(
  jp: string,
  initialRomaji: string,
): string {
  const [romaji, setRomaji] = useState(initialRomaji)

  useEffect(() => {
    setRomaji(initialRomaji)
    if (initialRomaji.trim() || !jp.trim()) return
    let cancelled = false
    void lookupRomajiForJapanese(jp).then((r) => {
      if (!cancelled && r) setRomaji(r)
    })
    return () => {
      cancelled = true
    }
  }, [jp, initialRomaji])

  return romaji
}
