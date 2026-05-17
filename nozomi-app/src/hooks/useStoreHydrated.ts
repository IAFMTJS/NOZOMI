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
    return useNozomiStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  return hydrated
}
