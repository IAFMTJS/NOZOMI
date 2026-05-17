import { useEffect, useRef } from 'react'
import { isMobileDevice } from '@/utils/device'

interface Props {
  bars?: number
  className?: string
  tall?: boolean
}

function readOrbLevel(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    '--orb-audio-level',
  )
  const n = parseFloat(raw)
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0
}

export function WaveformStrip({ bars = 48, className = '', tall = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const smoothRef = useRef(0)
  const barCount = isMobileDevice() ? Math.min(bars, 36) : bars
  const h = tall ? 56 : 48

  useEffect(() => {
    const root = containerRef.current
    if (!root) return

    const barEls = Array.from(
      root.querySelectorAll<HTMLDivElement>('[data-wave-bar]'),
    )
    if (!barEls.length) return

    const phases = barEls.map((_, i) => i * 0.35)
    let raf = 0
    const maxH = tall ? 46 : 38
    const center = (barEls.length - 1) / 2

    const tick = () => {
      const target = readOrbLevel()
      const smooth = smoothRef.current
      smoothRef.current += (target - smooth) * (target > smooth ? 0.42 : 0.16)
      const level = smoothRef.current
      const time = performance.now() * 0.001

      for (let i = 0; i < barEls.length; i++) {
        const distFromCenter = 1 - Math.abs(i - center) / (center + 0.5)
        const wave =
          0.4 +
          Math.sin(phases[i]! + time * 4.5) * 0.32 +
          Math.cos(i * 0.11 + time * 2) * 0.18
        const barH = 5 + level * maxH * wave * (0.55 + distFromCenter * 0.45)
        const el = barEls[i]!
        el.style.height = `${barH}px`
        el.style.opacity = String(0.42 + level * 0.52 * distFromCenter)
        el.style.boxShadow =
          level > 0.08
            ? `0 0 ${5 + level * 10}px rgba(var(--orb-glow-rgb, 168, 85, 247), 0.45)`
            : 'none'
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [barCount, tall])

  return (
    <div
      ref={containerRef}
      className={`orb-waveform flex w-full max-w-lg items-end justify-center gap-[3px] px-6 ${className}`}
      style={{ height: h }}
      aria-hidden
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <div key={i} data-wave-bar className="orb-wave-bar" style={{ height: '5px' }} />
      ))}
    </div>
  )
}
