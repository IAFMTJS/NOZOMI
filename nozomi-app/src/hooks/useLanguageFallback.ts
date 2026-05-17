import { useEffect, useState } from 'react'
import { lookupLanguageForJapanese } from '@/utils/romajiLookup'

/** Fill in romaji and English at display time when the text object has none. */
export function useLanguageFallback(
  jp: string,
  initial: { romaji?: string; en?: string } = {},
): { romaji: string; en: string; pending: boolean } {
  const [romaji, setRomaji] = useState(initial.romaji ?? '')
  const [en, setEn] = useState(initial.en ?? '')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    setRomaji(initial.romaji ?? '')
    setEn(initial.en ?? '')
    const clean = jp.trim()
    if (!clean) {
      setPending(false)
      return
    }
    if (initial.romaji?.trim() && initial.en?.trim()) {
      setPending(false)
      return
    }

    let cancelled = false
    setPending(true)
    void lookupLanguageForJapanese(clean)
      .then(({ romaji: r, en: e }) => {
        if (cancelled) return
        if (!initial.romaji?.trim() && r) setRomaji(r)
        if (!initial.en?.trim() && e) setEn(e)
      })
      .finally(() => {
        if (!cancelled) setPending(false)
      })
    return () => {
      cancelled = true
    }
  }, [jp, initial.romaji, initial.en])

  return { romaji, en, pending }
}
