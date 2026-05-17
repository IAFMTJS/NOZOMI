import { UI_LABELS } from '@/data/ui-labels'

const UI_TRANSCRIPT_PLACEHOLDERS = new Set(
  [
    UI_LABELS.statusFinalizing.jp,
    UI_LABELS.processingSpeech.jp,
    UI_LABELS.statusPreparing.jp,
    UI_LABELS.statusRecordingLocal.jp,
    UI_LABELS.heardYou.jp,
    '…',
    '—',
    '●',
  ].map((s) => s.trim()),
)

/** True when text is UI chrome, not user speech. */
export function isUiTranscriptPlaceholder(text: string): boolean {
  const t = text.trim()
  if (!t) return true
  return UI_TRANSCRIPT_PLACEHOLDERS.has(t)
}

/** Merge STT buffers only — never read liveTranscript (display-only). */
export function mergeHeardTranscript(parts: {
  lastRef?: string
  pendingInterim?: string
  captured?: string
}): string {
  return (
    parts.lastRef?.trim() ||
    parts.pendingInterim?.trim() ||
    parts.captured?.trim() ||
    ''
  )
}
