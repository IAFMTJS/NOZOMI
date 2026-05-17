type VoiceDebugPayload = Record<string, unknown>

const PREFIX = '[Nozomi:Voice]'

let forced = false
let interimLogCount = 0

function enabled(): boolean {
  if (forced) return true
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false
  return !!(window as Window & { __NOZOMI_VOICE_DEBUG__?: boolean })
    .__NOZOMI_VOICE_DEBUG__
}

function preview(text: string, max = 120): string {
  const t = text.trim()
  if (!t) return '(empty)'
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

function ts(): string {
  return new Date().toISOString().slice(11, 23)
}

export function setVoiceDebugForced(on: boolean): void {
  forced = on
}

export function isVoiceDebugEnabled(): boolean {
  return enabled()
}

export function voiceDebug(event: string, payload?: VoiceDebugPayload): void {
  if (!enabled()) return
  if (event === 'stt:interim') {
    interimLogCount += 1
    if (interimLogCount % 8 !== 1) return
  } else {
    interimLogCount = 0
  }
  const label = `${PREFIX} ${ts()} ${event}`
  if (payload && Object.keys(payload).length > 0) {
    console.log(label, payload)
  } else {
    console.log(label)
  }
}

export function voiceDebugWarn(event: string, payload?: VoiceDebugPayload): void {
  if (!enabled()) return
  console.warn(`${PREFIX} ${ts()} ${event}`, payload ?? '')
}

export function voiceDebugError(event: string, payload?: VoiceDebugPayload): void {
  if (!enabled()) return
  console.error(`${PREFIX} ${ts()} ${event}`, payload ?? '')
}

export function voiceDebugText(label: string, text: string): void {
  voiceDebug(label, { text: preview(text), length: text.trim().length })
}

export type VoiceCaptureSnapshot = {
  lastRef: string
  pendingInterim: string
  liveTranscript: string
  captured: string
  resolved: string
  everHeard: boolean
  processing: boolean
  sessionActive: boolean
}

export function voiceDebugCapture(
  event: string,
  snap: VoiceCaptureSnapshot,
  extra?: VoiceDebugPayload,
): void {
  if (!enabled()) return
  voiceDebug(event, {
    ...extra,
    lastRef: preview(snap.lastRef),
    pendingInterim: preview(snap.pendingInterim),
    liveTranscript: preview(snap.liveTranscript),
    captured: preview(snap.captured),
    resolved: preview(snap.resolved),
    everHeard: snap.everHeard,
    processing: snap.processing,
    sessionActive: snap.sessionActive,
  })
}

export function installVoiceDebugConsole(
  dumpState?: () => Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return
  const w = window as Window & {
    __NOZOMI_VOICE_DEBUG__?: boolean
    nozomiVoiceDebug?: (on?: boolean) => boolean
    nozomiVoiceDump?: () => void
  }
  w.nozomiVoiceDebug = (on?: boolean) => {
    if (typeof on === 'boolean') {
      w.__NOZOMI_VOICE_DEBUG__ = on
      forced = on
    } else {
      w.__NOZOMI_VOICE_DEBUG__ = !enabled()
      forced = !!w.__NOZOMI_VOICE_DEBUG__
    }
    console.log(
      `${PREFIX} debug ${forced || w.__NOZOMI_VOICE_DEBUG__ ? 'ON' : 'OFF'} (refresh not required)`,
    )
    return !!(forced || w.__NOZOMI_VOICE_DEBUG__)
  }
  w.nozomiVoiceDump = () => {
    if (dumpState) {
      console.log(`${PREFIX} dump`, dumpState())
    } else {
      console.log(`${PREFIX} dump (no state provider registered)`)
    }
  }
  if (enabled()) {
    console.info(
      `${PREFIX} dev logging ON. Commands: nozomiVoiceDebug(), nozomiVoiceDump()`,
    )
  }
}
