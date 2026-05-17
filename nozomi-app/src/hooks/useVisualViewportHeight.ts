import { useSyncExternalStore } from 'react'

function subscribe(onStoreChange: () => void) {
  const viewport = window.visualViewport
  let raf = 0
  const schedule = () => {
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(onStoreChange)
  }
  window.addEventListener('resize', schedule)
  viewport?.addEventListener('resize', schedule)
  viewport?.addEventListener('scroll', schedule)
  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', schedule)
    viewport?.removeEventListener('resize', schedule)
    viewport?.removeEventListener('scroll', schedule)
  }
}

function getViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight
}

export function useVisualViewportHeight() {
  return useSyncExternalStore(subscribe, getViewportHeight, () => 800)
}

/** Clamp orb diameter so header, controls, and safe areas still fit on screen. */
export function useOrbSize(preferred: number, reservedPx: number, min = 120) {
  const height = useVisualViewportHeight()
  const max = Math.max(min, height - reservedPx)
  return Math.round(Math.min(preferred, max))
}
