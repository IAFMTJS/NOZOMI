/** Voice turn: max wait for conversation engine. */
export const VOICE_TURN_TIMEOUT_MS = 12_000

/** After stop: wait for local Whisper transcript. */
export const FINISH_WAIT_LOCAL_MS = 45_000

/** After stop: browser STT when we saw audio energy. */
export const FINISH_WAIT_HEARD_MS = 6_000

/** After stop: browser STT default wait. */
export const FINISH_WAIT_DEFAULT_MS = 8_000

export const MIC_LEVEL_HEARD_THRESHOLD = 0.04

export const UI_AUDIO_LEVEL_THROTTLE_MS = 50

export const SPEECH_OUTPUT_IDLE_MAX_MS = 12_000
