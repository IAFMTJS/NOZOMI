import { UI_LABELS } from '@/data/ui-labels'
import { useListenPhase } from '@/features/voice/hooks/useListenPhase'
import type { ListenPhase } from '@/features/voice/logic/listenPresence'
import { getSttEngine, resolveSttEngineForLang } from '@/features/voice/logic/sttEngine'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import { getActiveSttEngine, isListenSessionActive } from '@/features/voice/logic/listenStore'
import { useLanguageFallback } from '@/hooks/useLanguageFallback'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'

const PHASE_LABEL: Record<ListenPhase, { jp: string; romaji: string; en: string }> = {
  idle: UI_LABELS.heardYou,
  preparing: UI_LABELS.statusPreparing,
  capturing: UI_LABELS.heardYou,
  finalizing: UI_LABELS.statusFinalizing,
  processing: UI_LABELS.processingSpeech,
  speaking: UI_LABELS.speakToInterrupt,
  error: {
    jp: 'エラー',
    romaji: 'Erā',
    en: 'Error',
  },
}

export function LiveTranscript() {
  const liveTranscript = useUiStore((s) => s.liveTranscript)
  const speechInputLang = useNozomiStore((s) => s.settings.speechInputLang)
  const phase = useListenPhase()
  const recognitionLang = resolveSpeechRecognitionLang(speechInputLang)
  const activeEngine = isListenSessionActive() ? getActiveSttEngine() : null
  const usesLocalStt =
    (activeEngine ?? resolveSttEngineForLang(getSttEngine(), recognitionLang)) === 'local'
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
    phase === 'capturing' && usesLocalStt && !trimmed
      ? UI_LABELS.statusRecordingLocal
      : PHASE_LABEL[phase]

  const showRomajiEn =
    trimmed.length > 0 && trimmed !== UI_LABELS.statusFinalizing.jp

  return (
    <div
      className="voice-live-transcript"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-listen-phase={phase}
      data-testid="live-transcript"
    >
      <div className="voice-live-transcript__phase">
        <span className="voice-live-transcript__dot" aria-hidden />
        <div className="voice-live-transcript__phase-text space-y-0.5 text-[10px] leading-tight">
          <p className="font-medium text-nozomi-text/95">{label.jp}</p>
          <p className="italic text-nozomi-muted/80">{label.romaji}</p>
        </div>
      </div>
      <p className="msg-jp voice-live-transcript__jp min-h-[1.5rem] text-sm font-medium leading-snug text-nozomi-text">
        {trimmed || (
          <span className="text-nozomi-muted/60 animate-pulse">
            {phase === 'finalizing' || phase === 'processing'
              ? '…'
              : phase === 'capturing'
                ? '●'
                : '—'}
          </span>
        )}
      </p>
      {showRomajiEn && (
        <div className="voice-live-transcript__lines space-y-0.5 text-center">
          {romaji ? (
            <p className="msg-romaji whitespace-pre-line text-xs italic leading-snug text-nozomi-muted">
              {romaji}
            </p>
          ) : pending ? (
            <p className="msg-romaji text-xs italic text-nozomi-muted/40 animate-pulse">…</p>
          ) : null}
          {en ? (
            <p className="msg-en whitespace-pre-line text-[0.6875rem] leading-snug text-nozomi-muted/80">
              {en}
            </p>
          ) : pending ? (
            <p className="msg-en text-[0.6875rem] text-nozomi-muted/40 animate-pulse">…</p>
          ) : null}
        </div>
      )}
    </div>
  )
}
