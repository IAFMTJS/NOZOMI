import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ensureLexiconLoaded } from '@/database/importService'
import { useUiStore } from '@/store/useUiStore'

const LEXICON_ROUTES = new Set(['/chat', '/word', '/listen', '/favorites'])

/** Load lexicon JSON only when a surface needs tap lookup — not on cold boot. */
export function useDeferredLexiconLoad(): void {
  const { pathname } = useLocation()
  const dataReady = useUiStore((s) => s.dataReady)

  useEffect(() => {
    if (!dataReady || !LEXICON_ROUTES.has(pathname)) return

    const load = () => void ensureLexiconLoaded()
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(load, { timeout: 8_000 })
      return () => cancelIdleCallback(id)
    }
    const timer = window.setTimeout(load, 400)
    return () => window.clearTimeout(timer)
  }, [pathname, dataReady])
}
