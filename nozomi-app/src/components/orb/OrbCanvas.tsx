import { useEffect, useRef } from 'react'
import {
  getOrbAudioLevel,
  subscribeOrbAudioLevel,
} from '@/systems/orb/orbAudioLevel'
import { isMobileDevice } from '@/utils/device'
import type { OrbState } from '@/types/domain'

interface Props {
  size: number
  state: OrbState
  intensity: number
  reduced: boolean
}

type Particle = {
  angle: number
  dist: number
  speed: number
  size: number
  hue: number
  layer: number
}

function stateHue(state: OrbState): { h1: number; h2: number; h3: number } {
  switch (state) {
    case 'listening':
      return { h1: 270, h2: 195, h3: 165 }
    case 'speaking':
      return { h1: 285, h2: 250, h3: 210 }
    case 'thinking':
      return { h1: 255, h2: 220, h3: 190 }
    default:
      return { h1: 275, h2: 245, h3: 215 }
  }
}

export function OrbCanvas({ size, state, intensity, reduced }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const timeRef = useRef(0)
  const stateRef = useRef(state)
  const audioRef = useRef(0)
  const intensityRef = useRef(intensity)
  const reducedRef = useRef(reduced)

  stateRef.current = state
  intensityRef.current = intensity
  reducedRef.current = reduced

  useEffect(() => {
    return subscribeOrbAudioLevel(() => {
      audioRef.current = getOrbAudioLevel()
    })
  }, [])

  useEffect(() => {
    const n = isMobileDevice() ? 48 : 72
    particlesRef.current = Array.from({ length: n }, (_, i) => ({
      angle: (i / n) * Math.PI * 2,
      dist: 0.35 + (i % 5) * 0.08,
      speed: 0.3 + (i % 7) * 0.06,
      size: 1 + (i % 4) * 0.6,
      hue: 260 + (i % 12) * 8,
      layer: i % 3,
    }))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const px = Math.floor(size * dpr)
    canvas.width = px
    canvas.height = px
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`

    let raf = 0
    let running = true
    let paused = document.hidden

    const onVisibility = () => {
      paused = document.hidden
      if (!paused) draw()
    }
    document.addEventListener('visibilitychange', onVisibility)

    const draw = () => {
      if (!running || paused) return
      const reducedNow = reducedRef.current
      timeRef.current += reducedNow ? 0.01 : 0.016
      audioRef.current = getOrbAudioLevel()
      const t = timeRef.current
      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2
      const audioLevelNow = audioRef.current
      const intensityNow = intensityRef.current
      const stateNow = stateRef.current
      const hues = stateHue(stateNow)
      const baseR = w * 0.22
      const pulse = 1 + audioLevelNow * 0.22 * intensityNow
      const R = baseR * pulse
      const { h1, h2, h3 } = hues

      ctx.clearRect(0, 0, w, h)

      ctx.globalCompositeOperation = 'screen'
      for (let b = 0; b < 4; b++) {
        const bx = cx + Math.cos(t * 0.4 + b * 1.7) * R * 0.35
        const by = cy + Math.sin(t * 0.35 + b * 2.1) * R * 0.3
        const br = R * (1.2 + b * 0.25 + audioLevelNow * 0.3)
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br)
        g.addColorStop(0, `hsla(${h1 + b * 15}, 90%, 65%, ${0.12 + audioLevelNow * 0.08})`)
        g.addColorStop(0.5, `hsla(${h2}, 80%, 50%, 0.06)`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(bx, by, br, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      const ringCount = stateNow === 'thinking' ? 6 : 5
      for (let r = 0; r < ringCount; r++) {
        const ringR = R * (1.05 + r * 0.14) + Math.sin(t * 2 + r) * 3 * dpr
        const rot = t * (0.25 + r * 0.08) * (r % 2 === 0 ? 1 : -1)
        const segments = 8 + r * 2
        const gap = 0.35
        ctx.lineWidth = (1.5 + r * 0.3) * dpr
        for (let s = 0; s < segments; s++) {
          const a0 = rot + (s / segments) * Math.PI * 2
          const a1 = a0 + (Math.PI * 2) / segments - gap
          const grad = ctx.createLinearGradient(
            cx + Math.cos(a0) * ringR,
            cy + Math.sin(a0) * ringR,
            cx + Math.cos(a1) * ringR,
            cy + Math.sin(a1) * ringR,
          )
          grad.addColorStop(0, `hsla(${h1}, 100%, 70%, ${0.35 - r * 0.04})`)
          grad.addColorStop(1, `hsla(${h3}, 100%, 60%, ${0.15 - r * 0.02})`)
          ctx.strokeStyle = grad
          ctx.beginPath()
          ctx.arc(cx, cy, ringR, a0, a1)
          ctx.stroke()
        }
      }

      const particles = particlesRef.current
      const speedMult =
        stateNow === 'listening'
          ? 1.8
          : stateNow === 'thinking'
            ? 2.4
            : stateNow === 'speaking'
              ? 1.4
              : 0.9
      ctx.globalCompositeOperation = 'lighter'
      for (const p of particles) {
        const layerScale = 1 + p.layer * 0.12
        const ang = p.angle + t * p.speed * speedMult * (p.layer === 1 ? -1 : 1)
        const dist = R * p.dist * layerScale + audioLevelNow * R * 0.15
        const x = cx + Math.cos(ang) * dist
        const y = cy + Math.sin(ang) * dist * 0.92
        const alpha = 0.25 + p.layer * 0.15 + audioLevelNow * 0.35
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.size * 3 * dpr)
        g.addColorStop(0, `hsla(${p.hue + h1 * 0.05}, 100%, 85%, ${alpha})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, p.size * 3 * dpr, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      for (const [ox, hueOff, alpha] of [
        [-2 * dpr, -8, 0.55],
        [2 * dpr, 8, 0.45],
        [0, 0, 1],
      ] as const) {
        const g = ctx.createRadialGradient(
          cx + ox,
          cy - R * 0.15,
          R * 0.05,
          cx,
          cy,
          R * 1.05,
        )
        g.addColorStop(0, `hsla(${h1 + hueOff}, 100%, 95%, ${alpha})`)
        g.addColorStop(0.25, `hsla(${h2 + hueOff}, 95%, 70%, ${alpha * 0.85})`)
        g.addColorStop(0.55, `hsla(${h3 + hueOff}, 90%, 45%, ${alpha * 0.6})`)
        g.addColorStop(0.85, `hsla(${h1 + hueOff}, 80%, 25%, ${alpha * 0.35})`)
        g.addColorStop(1, 'transparent')
        ctx.globalAlpha = ox === 0 ? 1 : 0.35
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(cx, cy, R * 1.02, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      const highlight = ctx.createRadialGradient(
        cx - R * 0.35,
        cy - R * 0.4,
        0,
        cx,
        cy,
        R * 1.1,
      )
      highlight.addColorStop(0, 'rgba(255,255,255,0.55)')
      highlight.addColorStop(0.15, 'rgba(230,210,255,0.25)')
      highlight.addColorStop(0.45, 'rgba(120,80,200,0.08)')
      highlight.addColorStop(1, 'transparent')
      ctx.fillStyle = highlight
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fill()

      const rim = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.05)
      rim.addColorStop(0, 'transparent')
      rim.addColorStop(0.85, `hsla(${h1}, 100%, 75%, 0.5)`)
      rim.addColorStop(1, `hsla(${h2}, 100%, 50%, 0.15)`)
      ctx.strokeStyle = rim
      ctx.lineWidth = 3 * dpr
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.98, 0, Math.PI * 2)
      ctx.stroke()

      if (stateNow === 'listening') {
        const bars = 11
        const bw = 3 * dpr
        const gap = 4 * dpr
        const totalW = bars * (bw + gap)
        for (let i = 0; i < bars; i++) {
          const bh =
            (12 + audioLevelNow * 40 + Math.sin(t * 8 + i * 0.7) * 8) * dpr
          const x = cx - totalW / 2 + i * (bw + gap)
          const g = ctx.createLinearGradient(x, cy - bh / 2, x, cy + bh / 2)
          g.addColorStop(0, 'rgba(255,255,255,0.95)')
          g.addColorStop(1, `hsla(${h3}, 100%, 70%, 0.8)`)
          ctx.fillStyle = g
          ctx.shadowColor = `hsla(${h3}, 100%, 70%, 0.9)`
          ctx.shadowBlur = 12 * dpr
          ctx.fillRect(x, cy - bh / 2, bw, bh)
        }
        ctx.shadowBlur = 0
      }

      if (stateNow === 'speaking') {
        for (let rip = 0; rip < 3; rip++) {
          const phase = (t * 1.2 + rip * 0.33) % 1
          const ripR = R * (1 + phase * 0.9)
          ctx.strokeStyle = `hsla(${h1}, 100%, 75%, ${(1 - phase) * 0.35})`
          ctx.lineWidth = 2 * dpr
          ctx.beginPath()
          ctx.arc(cx, cy, ripR, 0, Math.PI * 2)
          ctx.stroke()
        }
      }

      if (stateNow === 'thinking') {
        for (let i = 0; i < 3; i++) {
          const a = t * 2.5 + (i * Math.PI * 2) / 3
          const x = cx + Math.cos(a) * R * 0.55
          const y = cy + Math.sin(a) * R * 0.55
          ctx.fillStyle = `hsla(${h3 + i * 20}, 100%, 80%, 0.9)`
          ctx.shadowColor = `hsla(${h3}, 100%, 70%, 1)`
          ctx.shadowBlur = 16 * dpr
          ctx.beginPath()
          ctx.arc(x, y, 4 * dpr, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.shadowBlur = 0
      }

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      running = false
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(raf)
    }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      className="relative z-10 block"
      aria-hidden
    />
  )
}
