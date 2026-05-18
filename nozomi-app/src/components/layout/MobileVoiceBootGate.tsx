import { BootScreen } from '@/components/ui/BootScreen'
import { VoiceBootScreen } from '@/components/ui/VoiceBootScreen'
import { needsMobileVoiceBoot } from '@/features/voice/logic/mobileVoiceBoot'
import { resolveSpeechRecognitionLang } from '@/features/voice/logic/speechLocale'
import { useMobileVoiceBoot } from '@/hooks/useMobileVoiceBoot'
import { useNozomiStore } from '@/store/useNozomiStore'
import { useUiStore } from '@/store/useUiStore'

/** Blocks routes until app data + mobile Whisper boot are ready. */
export function MobileVoiceBootGate({ children }: { children: React.ReactNode }) {
  useMobileVoiceBoot()
  const dataReady = useUiStore((s) => s.dataReady)
  const voiceBootPhase = useUiStore((s) => s.voiceBootPhase)
  const speechInputLang = useNozomiStore((s) => s.settings.speechInputLang)
  const needsVoiceBoot =
    dataReady &&
    needsMobileVoiceBoot(resolveSpeechRecognitionLang(speechInputLang))

  if (!dataReady) {
    return <BootScreen />
  }

  if (needsVoiceBoot && voiceBootPhase !== 'ready' && voiceBootPhase !== 'skipped') {
    return <VoiceBootScreen />
  }

  return <>{children}</>
}
