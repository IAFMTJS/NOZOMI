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

export { isOfflineSttReady, whenOfflineSttReady } from '@/systems/speech/offlineStt'
