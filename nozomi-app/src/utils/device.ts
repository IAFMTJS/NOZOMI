export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

export function isWindows(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Windows/i.test(navigator.userAgent)
}

/** iPhone/iPad Safari (not Chrome/Firefox on iOS). */
export function isIosSafari(): boolean {
  if (!isIos()) return false
  const ua = navigator.userAgent
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
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

/** iOS Safari requires getUserMedia inside the user-gesture call stack. */
export function needsGestureLockedMic(): boolean {
  return isIos()
}
