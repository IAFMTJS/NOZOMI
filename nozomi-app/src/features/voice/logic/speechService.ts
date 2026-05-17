/**
 * Speech / listen / TTS public API.
 * Implementation is split across listenStore, browserSttListen, recordedSttListen, listenLifecycle.
 */
export type {
  SpeechError,
  SpeechErrorCode,
  SpeechCallbacks,
  StartListeningOptions,
} from '@/systems/speech/types'

export {
  micNeedsSecureContext,
  speechSupported,
  micErrorFromUnknown,
  mapSpeechRecognitionError as mapSpeechError,
  primeMicrophonePermission,
  prepareMicrophone,
  acquireSharedMicrophone,
  releaseSharedMicrophone,
} from '@/systems/speech/speechCapabilities'

export {
  isSpeechOutputActive,
  whenSpeechOutputIdle,
  micCooldownAfterSpeechMs,
  speakJapanese,
  stopSpeaking,
} from '@/systems/speech/speechTts'

export {
  startListening,
  finalizeListening,
  cancelListening,
  markListenTurnHandled,
  endListenSessionAfterTurn,
  stopListening,
  createAudioLevelLoop,
  attachListeningCallbacks,
  bindListeningHandlers,
  getCapturedTranscript,
  getPendingTranscript,
  getListenSignals,
  getSttDebugState,
  isListenSessionActive,
  markListenArmedFromGesture,
  consumeListenArmedFromGesture,
  syncCaptureFromDisplay,
  whenSttWorkIdle,
} from '@/systems/speech/listenLifecycle'

export {
  getListenSession,
  getActiveSttEngine,
} from '@/systems/speech/listenStore'

export {
  isOfflineSttReady,
  whenOfflineSttReady,
  releaseOfflineSttPipeline,
} from '@/systems/speech/offlineStt'

export {
  cancelScheduledReleaseOfflineStt,
  scheduleReleaseOfflineSttPipeline,
  touchOfflineSttPipeline,
} from '@/features/voice/logic/offlineSttLifecycle'

export {
  startMicCaptureFromGesture,
  releaseGestureMicStream,
} from '@/systems/speech/micGesture'

export { isMicRecorderActive } from '@/systems/speech/micSessionRecorder'

export {
  browserSttViableForLang,
  resolveSttEngineForLang,
} from '@/systems/speech/sttEngine'

export {
  NOZOMI_VOICE_AUTO,
  formatJapaneseVoiceLabel,
  listRankedJapaneseVoices,
  pickJapaneseVoice,
  warmJapaneseVoices,
} from '@/systems/speech/japaneseVoicePicker'
