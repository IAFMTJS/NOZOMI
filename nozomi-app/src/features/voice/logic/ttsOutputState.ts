/** Unified “assistant is speaking” flag for browser TTS + cloud Audio. */

let cloudAudio: HTMLAudioElement | null = null
let cloudPlaying = false
const listeners = new Set<() => void>()

function notify(): void {
  for (const fn of listeners) fn()
}

export function registerCloudTtsAudio(audio: HTMLAudioElement | null): void {
  cloudAudio = audio
}

export function setCloudTtsPlaying(active: boolean): void {
  if (cloudPlaying === active) return
  cloudPlaying = active
  notify()
}

export function isBrowserSynthActive(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  return window.speechSynthesis.speaking || window.speechSynthesis.pending
}

export function isAnyTtsOutputActive(): boolean {
  if (isBrowserSynthActive()) return true
  if (cloudPlaying && cloudAudio && !cloudAudio.paused) return true
  return false
}

/** Clear stuck browser synth flags (Chrome keeps `speaking` true after cancel). */
export function reconcileStuckBrowserSynth(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const synth = window.speechSynthesis
  if (!synth.speaking && !synth.pending) return
  try {
    synth.cancel()
    synth.pause()
    synth.resume()
  } catch {
    /* ignore */
  }
}

export function subscribeTtsOutput(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}
