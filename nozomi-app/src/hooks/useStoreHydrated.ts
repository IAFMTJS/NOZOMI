import { useEffect, useState } from 'react'
import { useNozomiStore } from '@/store/useNozomiStore'

/** True after persisted settings/profile have been loaded from storage. */
export function useStoreHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useNozomiStore.persist.hasHydrated())

  useEffect(() => {
    if (useNozomiStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }

    const unsub = useNozomiStore.persist.onFinishHydration(() => setHydrated(true))
    const fallback = window.setTimeout(() => setHydrated(true), 6_000)
    return () => {
      unsub()
      window.clearTimeout(fallback)
    }
  }, [])

  return hydrated
}
