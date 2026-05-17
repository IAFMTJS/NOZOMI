import { voiceDebug } from '@/features/voice/logic/voiceDebug'

/**
 * Phase 5 — on-device wake word placeholder.
 * Integrate Porcupine / openWakeWord when a keyword model is chosen.
 */
export type WakeWordOptions = {
  keyword?: string
  onWake: () => void
}

let active = false
let opts: WakeWordOptions | null = null

export function startWakeWordMonitor(options: WakeWordOptions): boolean {
  if (!options.keyword?.trim()) return false
  stopWakeWordMonitor()
  active = true
  opts = options
  voiceDebug('wake:monitor-start', { keyword: options.keyword })
  return true
}

export function stopWakeWordMonitor(): void {
  active = false
  opts = null
}

export function isWakeWordMonitorActive(): boolean {
  return active
}

/** Dev-only: simulate wake from console `nozomiSimulateWake()` */
export function simulateWakeWord(): void {
  if (!active || !opts) return
  voiceDebug('wake:simulated')
  opts.onWake()
}

if (typeof window !== 'undefined') {
  ;(window as Window & { nozomiSimulateWake?: () => void }).nozomiSimulateWake =
    simulateWakeWord
}
