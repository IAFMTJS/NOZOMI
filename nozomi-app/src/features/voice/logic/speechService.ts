/**
 * Speech / listen / TTS public API.
 * Implementation is split across listenStore, browserSttListen, recordedSttListen, listenLifecycle.
 */
export type {
  SpeechError,
  SpeechErrorCode,
  SpeechCallbacks,
  StartListeningOptions,
} from './types'

export {
  micNeedsSecureContext,
  speechSupported,
  micErrorFromUnknown,
  mapSpeechRecognitionError as mapSpeechError,
  primeMicrophonePermission,
  prepareMicrophone,
  acquireSharedMicrophone,
  releaseSharedMicrophone,
  getSharedMicStream,
  markMicPrimed,
  isMicRecentlyPrimed,
} from './speechCapabilities'

export {
  isSpeechOutputActive,
  whenSpeechOutputIdle,
  micCooldownAfterSpeechMs,
  speakJapanese,
  stopSpeaking,
} from './speechTts'

export {
  startListening,
  finalizeListening,
  cancelListening,
  clearStaleListenSession,
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
} from './listenLifecycle'

export {
  getListenSession,
  getActiveSttEngine,
} from './listenStore'

export {
  isOfflineSttReady,
  whenOfflineSttReady,
  releaseOfflineSttPipeline,
} from './offlineStt'

export {
  cancelScheduledReleaseOfflineStt,
  scheduleReleaseOfflineSttPipeline,
  touchOfflineSttPipeline,
} from './offlineSttLifecycle'

export {
  startMicCaptureFromGesture,
  releaseGestureMicStream,
} from './micGesture'

export { isMicRecorderActive } from './micSessionRecorder'

export {
  browserSttViableForLang,
  resolveSttEngineForLang,
} from './sttEngine'

export {
  NOZOMI_VOICE_AUTO,
  formatJapaneseVoiceLabel,
  listRankedJapaneseVoices,
  pickJapaneseVoice,
  warmJapaneseVoices,
} from './japaneseVoicePicker'
