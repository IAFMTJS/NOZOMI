export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

/** Coarse pointer or mobile — use CSS orb, no canvas loop, lighter STT. */
export function prefersLowPowerOrb(): boolean {
  if (typeof window === 'undefined') return false
  if (isMobileDevice()) return true
  return window.matchMedia('(pointer: coarse)').matches
}

export function isLowMemoryDevice(): boolean {
  const dm = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return isMobileDevice() || (typeof dm === 'number' && dm > 0 && dm <= 4)
}
