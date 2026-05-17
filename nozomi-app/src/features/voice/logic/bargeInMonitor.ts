import { createAudioLevelLoop } from '@/features/voice/logic/listenLifecycle'
import { markVoiceSpan } from '@/features/voice/logic/voiceTurnMetrics'
import { voiceDebug } from '@/features/voice/logic/voiceDebug'
import { isBargeInArmed } from '@/features/voice/logic/voiceTurnBridge'

/** Higher than listen threshold — reduces false triggers from speaker bleed. */
const BARGE_LEVEL_THRESHOLD = 0.14
const SUSTAINED_MS = 320
const COOLDOWN_MS = 500

export type BargeInMonitorOptions = {
  onBargeIn: () => void
  /** Return false to ignore level ticks (e.g. while not speaking). */
  isActive: () => boolean
}

let loop: ReturnType<typeof createAudioLevelLoop> | null = null
let speechAboveSince: number | null = null
let lastFiredAt = 0
let options: BargeInMonitorOptions | null = null

function onLevel(level: number): void {
  if (!options?.isActive() || !isBargeInArmed()) {
    speechAboveSince = null
    return
  }
  const now = performance.now()
  if (level > BARGE_LEVEL_THRESHOLD) {
    if (speechAboveSince == null) speechAboveSince = now
    if (
      now - speechAboveSince >= SUSTAINED_MS &&
      now - lastFiredAt >= COOLDOWN_MS
    ) {
      lastFiredAt = now
      speechAboveSince = null
      markVoiceSpan('barge_in')
      voiceDebug('barge-in:trigger', { level })
      options.onBargeIn()
    }
  } else {
    speechAboveSince = null
  }
}

export function startBargeInMonitor(opts: BargeInMonitorOptions): void {
  stopBargeInMonitor()
  options = opts
  speechAboveSince = null
  loop = createAudioLevelLoop(onLevel)
  void loop.start()
  voiceDebug('barge-in:start')
}

export function stopBargeInMonitor(): void {
  loop?.stop()
  loop = null
  options = null
  speechAboveSince = null
}

export function isBargeInMonitorActive(): boolean {
  return loop != null
}
