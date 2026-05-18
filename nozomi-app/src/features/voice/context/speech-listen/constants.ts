/** Voice turn: max wait for conversation engine. */
export const VOICE_TURN_TIMEOUT_MS = 12_000

/** User-facing STT wait before "couldn't hear you" (local Whisper). */
export const STT_USER_TIMEOUT_MS = 28_000

/** Hard cap on a single mic capture (mobile browsers OOM without this). */
export const MAX_RECORDING_MS = 10_000

/** Reject oversized uploads before decode / cloud STT. */
export const MAX_RECORDING_BLOB_BYTES = 2_500_000

/** Deepgram / cloud REST ceiling. */
export const CLOUD_STT_TIMEOUT_MS = 18_000

/** Safety: if UI stays in finalize/processing too long, force recovery. */
export const PIPELINE_STUCK_RECOVERY_MS = STT_USER_TIMEOUT_MS + 12_000

/** After stop: wait for local Whisper transcript (must exceed infer timeout). */
export const FINISH_WAIT_LOCAL_MS = 95_000

/** After stop: browser STT when we saw audio energy. */
export const FINISH_WAIT_HEARD_MS = 6_000

/** After stop: browser STT default wait. */
export const FINISH_WAIT_DEFAULT_MS = 8_000

export const MIC_LEVEL_HEARD_THRESHOLD = 0.04

export const UI_AUDIO_LEVEL_THROTTLE_MS = 50

export const SPEECH_OUTPUT_IDLE_MAX_MS = 12_000
