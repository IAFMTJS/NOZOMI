import { useEffect, useState } from 'react'
import { useNozomiStore } from '@/store/useNozomiStore'

/** True once zustand/persist has finished reading localStorage. */
export function usePersistHydration(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    useNozomiStore.persist.hasHydrated(),
  )

  useEffect(() => {
    if (useNozomiStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    return useNozomiStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  return hydrated
}
