import type { StateStorage } from 'zustand/middleware'

const WRITE_DELAY_MS = 1200

/**
 * Debounced localStorage — avoids main-thread stalls when orb/audio updates fire often.
 */
export function createDebouncedPersistStorage(
  base: StateStorage = localStorage,
): StateStorage {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: { name: string; value: string } | null = null
  let lastSerialized = ''

  const flush = () => {
    timer = null
    if (!pending) return
    const { name, value } = pending
    pending = null
    if (value === lastSerialized) return
    lastSerialized = value
    base.setItem(name, value)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }

  return {
    getItem: (name) => base.getItem(name),
    setItem: (name, value) => {
      pending = { name, value }
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, WRITE_DELAY_MS)
    },
    removeItem: (name) => {
      if (timer) clearTimeout(timer)
      timer = null
      pending = null
      lastSerialized = ''
      base.removeItem(name)
    },
  }
}
