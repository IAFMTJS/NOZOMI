import { MIC_LEVEL_HEARD_THRESHOLD } from '@/features/voice/context/speech-listen/constants'

export type SilenceEndpointConfig = {
  minSpeechMs: number
  silenceMs: number
  maxTurnMs: number
}

export const DEFAULT_SILENCE_ENDPOINT: SilenceEndpointConfig = {
  minSpeechMs: 400,
  silenceMs: 900,
  maxTurnMs: 45_000,
}

export type SilenceEndpointingOptions = {
  config?: Partial<SilenceEndpointConfig>
  getLevel: () => number
  isActive: () => boolean
  onEndpoint: () => void
}

export function createSilenceEndpointing(opts: SilenceEndpointingOptions) {
  const config: SilenceEndpointConfig = {
    ...DEFAULT_SILENCE_ENDPOINT,
    ...opts.config,
  }
  let raf = 0
  let turnStartedAt = 0
  let speechStartedAt: number | null = null
  let silenceStartedAt: number | null = null
  let heardSpeech = false
  let fired = false

  const tick = () => {
    raf = requestAnimationFrame(tick)
    if (!opts.isActive() || fired) return

    const now = performance.now()
    if (turnStartedAt === 0) turnStartedAt = now

    if (now - turnStartedAt >= config.maxTurnMs) {
      fired = true
      opts.onEndpoint()
      return
    }

    const level = opts.getLevel()
    if (level > MIC_LEVEL_HEARD_THRESHOLD) {
      heardSpeech = true
      if (speechStartedAt == null) speechStartedAt = now
      silenceStartedAt = null
      return
    }

    if (!heardSpeech || speechStartedAt == null) return
    if (now - speechStartedAt < config.minSpeechMs) return

    if (silenceStartedAt == null) silenceStartedAt = now
    if (now - silenceStartedAt >= config.silenceMs) {
      fired = true
      opts.onEndpoint()
    }
  }

  return {
    start() {
      fired = false
      turnStartedAt = 0
      speechStartedAt = null
      silenceStartedAt = null
      heardSpeech = false
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(tick)
    },
    stop() {
      cancelAnimationFrame(raf)
      raf = 0
    },
    reset() {
      fired = false
      turnStartedAt = 0
      speechStartedAt = null
      silenceStartedAt = null
      heardSpeech = false
    },
  }
}
