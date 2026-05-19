import { NozomiOrb } from '@/features/orb'
import { LanguageText } from '@/components/language/LanguageText'
import { useUiStore } from '@/store/useUiStore'
import { clearOfflineSttCache } from '@/features/voice/logic/offlineStt'
import { clearMobileVoiceBootCache, runMobileVoiceBoot } from '@/features/voice/logic/mobileVoiceBoot'
import {
  INITIAL_VOICE_BOOT_STATUS,
  voiceBootStatusLabel,
} from '@/features/voice/logic/voiceBootStatus'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import { useNozomiStore } from '@/store/useNozomiStore'

/** Mobile-only gate: load Whisper before the user can open voice routes. */
export function VoiceBootScreen() {
  const loadPhase = useUiStore((s) => s.voiceBootLoadPhase)
  const downloadPercent = useUiStore((s) => s.voiceBootDownloadPercent)
  const error = useUiStore((s) => s.voiceBootError)
  const setVoiceBootPhase = useUiStore((s) => s.setVoiceBootPhase)
  const setVoiceBootLoadPhase = useUiStore((s) => s.setVoiceBootLoadPhase)
  const setVoiceBootDownloadPercent = useUiStore((s) => s.setVoiceBootDownloadPercent)
  const setVoiceBootProgress = useUiStore((s) => s.setVoiceBootProgress)
  const setVoiceBootError = useUiStore((s) => s.setVoiceBootError)
  const speechInputLang = useNozomiStore((s) => s.settings.speechInputLang)

  const status = {
    phase: loadPhase ?? INITIAL_VOICE_BOOT_STATUS.phase,
    downloadPercent: downloadPercent,
  }

  const retry = () => {
    const lang = resolveSpeechRecognitionLang(speechInputLang)
    setVoiceBootPhase('loading')
    setVoiceBootLoadPhase('checking_cache')
    setVoiceBootDownloadPercent(null)
    setVoiceBootProgress(null)
    setVoiceBootError(null)
    clearMobileVoiceBootCache()
    void clearOfflineSttCache({ purgeDisk: true }).then(() =>
      runMobileVoiceBoot(lang, (next) => {
        setVoiceBootLoadPhase(next.phase)
        setVoiceBootDownloadPercent(next.downloadPercent)
        setVoiceBootProgress(
          next.phase === 'ready'
            ? 100
            : next.phase === 'downloading_weights'
              ? next.downloadPercent
              : null,
        )
      }),
    )
      .then(() => {
        setVoiceBootPhase('ready')
        setVoiceBootLoadPhase('ready')
        setVoiceBootProgress(100)
      })
      .catch((err) => {
        setVoiceBootPhase('error')
        setVoiceBootError(
          err instanceof Error ? err.message : 'Speech model could not load',
        )
      })
  }

  return (
    <div
      className="presence-screen flex flex-col items-center justify-center gap-6 bg-nozomi-bg px-6"
      aria-busy={!error}
      aria-label="Loading voice"
    >
      <NozomiOrb size={160} showPlatform />
      {error ? (
        <>
          <LanguageText
            text={{
              jp: '音声モデルを読み込めませんでした',
              romaji: 'Onsei moderu wo yomikomi masen deshita',
              en: 'Could not load the speech model',
            }}
            size="sm"
            align="center"
            passive
            hierarchy="presence"
          />
          <p className="max-w-sm text-center text-sm text-nozomi-muted">{error}</p>
          <button
            type="button"
            className="rounded-full bg-nozomi-accent px-6 py-2.5 text-sm font-medium text-nozomi-bg"
            onClick={retry}
          >
            Try again
          </button>
        </>
      ) : (
        <LanguageText
          text={voiceBootStatusLabel(status)}
          size="sm"
          align="center"
          passive
          hierarchy="presence"
        />
      )}
    </div>
  )
}
