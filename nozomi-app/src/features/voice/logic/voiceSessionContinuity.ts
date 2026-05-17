/** Notifies when Nozomi TTS finishes (for continuous listen mode). */

let onSpeechOutputEnded: (() => void) | null = null

export function setOnSpeechOutputEnded(handler: (() => void) | null): void {
  onSpeechOutputEnded = handler
}

export function notifySpeechOutputEnded(): void {
  onSpeechOutputEnded?.()
}
