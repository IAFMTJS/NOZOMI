import { useCallback, useRef } from 'react'

const TAP_MOVE_THRESHOLD_PX = 12

/**
 * Reliable tap for scrollable rows: uses onClick plus a small movement guard on pointer up.
 */
export function useReliableTap(handler: () => void) {
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const skipClickRef = useRef(false)

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    startRef.current = { x: e.clientX, y: e.clientY }
    skipClickRef.current = false
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const start = startRef.current
    startRef.current = null
    if (!start) return
    const dx = Math.abs(e.clientX - start.x)
    const dy = Math.abs(e.clientY - start.y)
    if (dx > TAP_MOVE_THRESHOLD_PX || dy > TAP_MOVE_THRESHOLD_PX) {
      skipClickRef.current = true
    }
  }, [])

  const onPointerCancel = useCallback(() => {
    startRef.current = null
    skipClickRef.current = true
  }, [])

  const onClick = useCallback(() => {
    if (skipClickRef.current) {
      skipClickRef.current = false
      return
    }
    handler()
  }, [handler])

  return { onPointerDown, onPointerUp, onPointerCancel, onClick }
}
