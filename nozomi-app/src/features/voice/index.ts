export * from './logic/speechService'
export {
  deriveListenPhase,
  derivePresenceOrbState,
  isListenCapturing,
  isPresenceBusy,
  type ListenPhase,
} from './logic/listenPresence'
export { useListenPhase } from './hooks/useListenPhase'
export { syncSpeechOutputPresence } from './logic/speechPresenceSync'
export {
  deriveVoiceTurnPhase,
  enterVoiceCapturing,
  enterVoiceFinalizing,
  enterVoiceGenerating,
  enterVoiceListenPrepare,
  enterVoiceUnderstanding,
  forceRecoverVoiceUi,
  syncIdleAfterVoiceTurn,
  type VoiceTurnPhase,
} from './logic/voiceTurnCoordinator'
export {
  SpeechListenProvider,
  useSpeechListen,
  type SpeechListenApi,
} from './context/SpeechListenContext'
export { MicButton } from './ui/MicButton'
export { LiveTranscript } from './ui/LiveTranscript'
export { WaveformStrip } from '@/features/orb'
export { ListeningMicHint } from './ui/ListeningMicHint'
export { MicPermissionBanner } from './ui/MicPermissionBanner'
export { NozomiVoicePicker } from './ui/NozomiVoicePicker'
export { useSpeechOutputActive } from './hooks/useSpeechOutputActive'
export { VoiceDebugOverlay } from './ui/VoiceDebugOverlay'
export {
  beginVoiceTurnMetrics,
  getVoiceTurnDeltas,
  summarizeLastVoiceTurn,
} from './logic/voiceTurnMetrics'
