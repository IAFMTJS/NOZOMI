import { useSyncExternalStore } from 'react'

function subscribe(onStoreChange: () => void) {
  const viewport = window.visualViewport
  window.addEventListener('resize', onStoreChange)
  viewport?.addEventListener('resize', onStoreChange)
  viewport?.addEventListener('scroll', onStoreChange)
  return () => {
    window.removeEventListener('resize', onStoreChange)
    viewport?.removeEventListener('resize', onStoreChange)
    viewport?.removeEventListener('scroll', onStoreChange)
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
