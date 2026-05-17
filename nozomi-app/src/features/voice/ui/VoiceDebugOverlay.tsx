import { useEffect, useState } from 'react'
import {
  getVoiceTurnDeltas,
  getVoiceTurnSpans,
} from '@/features/voice/logic/voiceTurnMetrics'
import { isVoiceDebugEnabled } from '@/features/voice/logic/voiceDebug'

function showOverlay(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('voiceDebug')
}

export function VoiceDebugOverlay() {
  const [visible] = useState(showOverlay)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!visible || !isVoiceDebugEnabled()) return
    const id = window.setInterval(() => setTick((t) => t + 1), 500)
    return () => clearInterval(id)
  }, [visible])

  if (!visible) return null

  const deltas = getVoiceTurnDeltas()
  const last = getVoiceTurnSpans().at(-1)
  const parts = Object.entries(deltas)
    .filter(([, ms]) => ms >= 0)
    .map(([k, ms]) => `${k}:${ms}`)

  return (
    <div
      className="pointer-events-none fixed bottom-2 left-2 z-50 max-w-[min(100vw-1rem,20rem)] rounded-lg border border-white/15 bg-black/75 px-2 py-1.5 font-mono text-[10px] leading-snug text-emerald-200/90"
      aria-hidden
      data-testid="voice-debug-overlay"
    >
      <div>voice debug</div>
      {last ? <div>last: {last.span}</div> : null}
      <div>{parts.length ? parts.join(' ') : '—'}</div>
    </div>
  )
}
