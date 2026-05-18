import { BootScreen } from '@/components/ui/BootScreen'
import { VoiceBootScreen } from '@/components/ui/VoiceBootScreen'
import { useMobileVoiceBoot } from '@/hooks/useMobileVoiceBoot'
import { useUiStore } from '@/store/useUiStore'

/** Blocks routes until app data + mobile Whisper boot are ready. */
export function MobileVoiceBootGate({ children }: { children: React.ReactNode }) {
  useMobileVoiceBoot()
  const dataReady = useUiStore((s) => s.dataReady)
  const voiceBootPhase = useUiStore((s) => s.voiceBootPhase)

  if (!dataReady) {
    return <BootScreen />
  }

  if (voiceBootPhase === 'loading' || voiceBootPhase === 'error') {
    return <VoiceBootScreen />
  }

  if (voiceBootPhase === 'idle') {
    return <BootScreen />
  }

  return <>{children}</>
}
