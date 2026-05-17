import { UI_LABELS } from '@/data/ui-labels'
import { useListenPhase } from '@/features/voice/hooks/useListenPhase'
import { getSttEngine, resolveSttEngineForLang } from '@/features/voice/logic/sttEngine'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import { useLanguageFallback } from '@/hooks/useLanguageFallback'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'

export function LiveTranscript() {
  const liveTranscript = useUiStore((s) => s.liveTranscript)
  const speechInputLang = useNozomiStore((s) => s.settings.speechInputLang)
  const phase = useListenPhase()
  const usesLocalStt =
    resolveSttEngineForLang(
      getSttEngine(),
      resolveSpeechRecognitionLang(speechInputLang),
    ) === 'local'
  const { romaji, en, pending } = useLanguageFallback(liveTranscript)
  const trimmed = liveTranscript.trim()

  const show =
    trimmed.length > 0 ||
    phase === 'capturing' ||
    phase === 'finalizing' ||
    phase === 'processing' ||
    phase === 'preparing'

  if (!show) return null

  const label =
    phase === 'finalizing'
      ? UI_LABELS.statusFinalizing
      : phase === 'processing'
        ? UI_LABELS.processingSpeech
        : phase === 'preparing'
          ? UI_LABELS.statusPreparing
          : phase === 'capturing' && usesLocalStt && !trimmed
            ? UI_LABELS.statusRecordingLocal
            : UI_LABELS.heardYou

  return (
    <div
      className="voice-live-transcript space-y-1 opacity-90"
      aria-live="polite"
      data-listen-phase={phase}
      data-testid="live-transcript"
    >
      <div className="space-y-0.5 text-[10px] leading-tight text-nozomi-muted">
        <p className="font-medium text-nozomi-text/90">{label.jp}</p>
        <p className="italic">{label.romaji}</p>
      </div>
      <div className="space-y-0.5 text-center">
        <p className="msg-jp min-h-[1.5rem] text-sm font-medium leading-snug text-nozomi-text">
          {trimmed || (
            <span className="text-nozomi-muted/60 animate-pulse">
              {phase === 'finalizing' || phase === 'processing'
                ? '…'
                : phase === 'capturing' && usesLocalStt
                  ? '●'
                  : '—'}
            </span>
          )}
        </p>
        {trimmed && (
          <>
            {romaji ? (
              <p className="msg-romaji whitespace-pre-line text-xs italic leading-snug text-nozomi-muted">
                {romaji}
              </p>
            ) : pending ? (
              <p className="msg-romaji text-xs italic text-nozomi-muted/40 animate-pulse">
                …
              </p>
            ) : null}
            {en ? (
              <p className="msg-en whitespace-pre-line text-[0.6875rem] leading-snug text-nozomi-muted/80">
                {en}
              </p>
            ) : pending ? (
              <p className="msg-en text-[0.6875rem] text-nozomi-muted/40 animate-pulse">
                …
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
