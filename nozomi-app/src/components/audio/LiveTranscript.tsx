import { UI_LABELS } from '@/data/ui-labels'
import { useRomajiFallback } from '@/hooks/useRomajiFallback'
import { useNozomiStore } from '@/store/useNozomiStore'
import type { SpeechState } from '@/types/domain'

interface Props {
  speechState: SpeechState
}

export function LiveTranscript({ speechState }: Props) {
  const liveTranscript = useNozomiStore((s) => s.liveTranscript)
  const romaji = useRomajiFallback(liveTranscript, '')
  const show =
    liveTranscript.length > 0 ||
    speechState === 'listening' ||
    speechState === 'processing'

  if (!show) return null

  const label =
    speechState === 'processing'
      ? UI_LABELS.processingSpeech
      : UI_LABELS.heardYou

  return (
    <div
      className="mx-auto w-full max-w-xs shrink-0 space-y-1 px-2 py-1 text-center opacity-80"
      aria-live="polite"
      data-testid="live-transcript"
    >
      <div className="space-y-0.5 text-[10px] leading-tight text-nozomi-muted">
        <p className="font-medium text-nozomi-text/90">{label.jp}</p>
        <p className="italic">{label.romaji}</p>
      </div>
      <div className="space-y-0.5">
        <p className="min-h-[1.5rem] text-sm font-medium leading-snug text-nozomi-text">
          {liveTranscript || (
            <span className="text-nozomi-muted/60 animate-pulse">…</span>
          )}
        </p>
        {romaji ? (
          <p className="text-xs italic leading-snug text-nozomi-muted">
            {romaji}
          </p>
        ) : liveTranscript ? (
          <p className="text-xs italic text-nozomi-muted/40 animate-pulse">
            …
          </p>
        ) : null}
      </div>
    </div>
  )
}
