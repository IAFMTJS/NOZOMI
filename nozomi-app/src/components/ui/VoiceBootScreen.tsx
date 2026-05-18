import { NozomiOrb } from '@/features/orb'
import { LanguageText } from '@/components/language/LanguageText'
import { useUiStore } from '@/store/useUiStore'
import { runMobileVoiceBoot } from '@/features/voice/logic/mobileVoiceBoot'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import { useNozomiStore } from '@/store/useNozomiStore'

/** Mobile-only gate: load Whisper before the user can open voice routes. */
export function VoiceBootScreen() {
  const progress = useUiStore((s) => s.voiceBootProgress)
  const error = useUiStore((s) => s.voiceBootError)
  const setVoiceBootPhase = useUiStore((s) => s.setVoiceBootPhase)
  const setVoiceBootProgress = useUiStore((s) => s.setVoiceBootProgress)
  const setVoiceBootError = useUiStore((s) => s.setVoiceBootError)
  const speechInputLang = useNozomiStore((s) => s.settings.speechInputLang)

  const retry = () => {
    const lang = resolveSpeechRecognitionLang(speechInputLang)
    setVoiceBootPhase('loading')
    setVoiceBootProgress(0)
    setVoiceBootError(null)
    void runMobileVoiceBoot(lang, setVoiceBootProgress)
      .then(() => {
        setVoiceBootPhase('ready')
        setVoiceBootProgress(100)
      })
      .catch((err) => {
        setVoiceBootPhase('error')
        setVoiceBootError(
          err instanceof Error ? err.message : 'Speech model could not load',
        )
      })
  }

  const pct =
    progress != null ? Math.min(100, Math.max(0, Math.round(progress))) : null

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
          text={{
            jp:
              pct != null
                ? `音声を準備中… ${pct}%`
                : '音声を準備中…',
            romaji: 'Onsei wo junbi chuu…',
            en:
              pct != null
                ? `Preparing voice… ${pct}%`
                : 'Preparing voice…',
          }}
          size="sm"
          align="center"
          passive
          hierarchy="presence"
        />
      )}
    </div>
  )
}
