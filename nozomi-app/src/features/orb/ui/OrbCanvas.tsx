import { useEffect, useRef } from 'react'
import { getOrbPalette, lerpOrbPalette } from '@/features/orb/logic/orbPalette'
import { getOrbAudioLevel } from '@/features/orb/logic/orbAudioLevel'
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
  hueOff: number
  layer: number
  twinkle: number
}

const IDLE_AUDIO_THRESHOLD = 0.02
const TARGET_FPS_ACTIVE = 60
const TARGET_FPS_IDLE = 28

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function readCssHue(varName: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName)
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : fallback
}

function resolvePalette(
  state: OrbState,
  transition: { from: OrbState; to: OrbState; t: number },
): { h1: number; h2: number; h3: number } {
  const base = getOrbPalette(state)
  if (transition.t >= 1) {
    return { h1: base.h1, h2: base.h2, h3: base.h3 }
  }
  const blended = lerpOrbPalette(
    getOrbPalette(transition.from),
    getOrbPalette(transition.to),
    easeOutCubic(transition.t),
  )
  const h1 = readCssHue('--orb-h1', blended.h1)
  const h2 = readCssHue('--orb-h2', blended.h2)
  const h3 = readCssHue('--orb-h3', blended.h3)
  return { h1, h2, h3 }
}

export function OrbCanvas({ size, state, intensity, reduced }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const timeRef = useRef(0)
  const smoothAudioRef = useRef(0)
  const stateRef = useRef(state)
  const intensityRef = useRef(intensity)
  const reducedRef = useRef(reduced)
  const transitionRef = useRef({ from: state, to: state, t: 1 })

  stateRef.current = state
  intensityRef.current = intensity
  reducedRef.current = reduced

  useEffect(() => {
    const tr = transitionRef.current
    if (state !== tr.to) {
      tr.from = tr.t >= 1 ? tr.to : tr.from
      tr.to = state
      tr.t = 0
    }
  }, [state])

  useEffect(() => {
    const mobile = isMobileDevice()
    const n = reduced ? (mobile ? 22 : 30) : mobile ? 40 : 64
    particlesRef.current = Array.from({ length: n }, (_, i) => ({
      angle: (i / n) * Math.PI * 2 + (i % 3) * 0.2,
      dist: 0.32 + (i % 6) * 0.07,
      speed: 0.28 + (i % 9) * 0.05,
      size: 0.8 + (i % 5) * 0.55,
      hueOff: (i % 14) * 6 - 20,
      layer: i % 4,
      twinkle: (i % 11) * 0.6,
    }))
  }, [reduced])

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
    let lastFrameAt = 0

    const onVisibility = () => {
      paused = document.hidden
      if (!paused) draw(performance.now())
    }
    document.addEventListener('visibilitychange', onVisibility)

    const draw = (now: number) => {
      if (!running) return
      if (paused) {
        raf = requestAnimationFrame(draw)
        return
      }

      const stateNow = stateRef.current
      const rawAudio = getOrbAudioLevel()
      const smooth = smoothAudioRef.current
      const attack = rawAudio > smooth ? 0.38 : 0.14
      smoothAudioRef.current += (rawAudio - smooth) * attack
      const audio = smoothAudioRef.current

      const reducedNow = reducedRef.current
      const intensityNow = intensityRef.current
      const idle = stateNow === 'idle' && audio < IDLE_AUDIO_THRESHOLD
      const targetInterval = 1000 / (idle ? TARGET_FPS_IDLE : TARGET_FPS_ACTIVE)

      if (lastFrameAt && now - lastFrameAt < targetInterval) {
        raf = requestAnimationFrame(draw)
        return
      }
      lastFrameAt = now

      const tr = transitionRef.current
      if (tr.t < 1) tr.t = Math.min(1, tr.t + 0.08)
      if (tr.t >= 1) tr.from = tr.to

      const timeStep = reducedNow ? 0.007 : idle ? 0.009 : 0.016
      timeRef.current += timeStep
      const t = timeRef.current

      const { h1, h2, h3 } = resolvePalette(stateNow, tr)
      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2
      const breathe =
        stateNow === 'idle'
          ? 1 + Math.sin(t * 1.1) * 0.03
          : stateNow === 'thinking'
            ? 1 + Math.sin(t * 2.2) * 0.04
            : 1
      const baseR = w * 0.21 * breathe
      const pulse = 1 + audio * 0.28 * intensityNow
      const R = baseR * pulse

      ctx.clearRect(0, 0, w, h)

      // Outer halo
      const haloG = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.2)
      haloG.addColorStop(0, `hsla(${h1}, 90%, 55%, ${0.06 + audio * 0.06})`)
      haloG.addColorStop(0.45, `hsla(${h2}, 85%, 45%, 0.03)`)
      haloG.addColorStop(1, 'transparent')
      ctx.fillStyle = haloG
      ctx.beginPath()
      ctx.arc(cx, cy, R * 2.2, 0, Math.PI * 2)
      ctx.fill()

      // Aurora blobs
      const blobCount = reducedNow ? 3 : 5
      ctx.globalCompositeOperation = 'screen'
      for (let b = 0; b < blobCount; b++) {
        const phase = t * (0.32 + b * 0.06) + b * 1.9
        const bx = cx + Math.cos(phase) * R * (0.38 + b * 0.04)
        const by = cy + Math.sin(phase * 0.92) * R * (0.34 + b * 0.03)
        const br = R * (1.15 + b * 0.22 + audio * 0.35)
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br)
        g.addColorStop(0, `hsla(${h1 + b * 12}, 95%, 68%, ${0.14 + audio * 0.1})`)
        g.addColorStop(0.45, `hsla(${h2 + b * 6}, 85%, 52%, 0.07)`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(bx, by, br, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      // Segmented orbital rings
      const ringCount = reducedNow ? 2 : stateNow === 'thinking' ? 6 : 4
      for (let r = 0; r < ringCount; r++) {
        const wobble = Math.sin(t * 1.8 + r * 0.9) * 2.5 * dpr
        const ringR = R * (1.08 + r * 0.13) + wobble
        const rot = t * (0.22 + r * 0.07) * (r % 2 === 0 ? 1 : -1)
        const segments = reducedNow ? 5 : 7 + r
        const gap = 0.28 + r * 0.04
        ctx.lineWidth = (1.2 + r * 0.35) * dpr
        ctx.lineCap = 'round'
        for (let s = 0; s < segments; s++) {
          const a0 = rot + (s / segments) * Math.PI * 2
          const a1 = a0 + (Math.PI * 2) / segments - gap
          const alpha = 0.38 - r * 0.05 + audio * 0.12
          ctx.strokeStyle = `hsla(${h1 + r * 8}, 100%, 72%, ${alpha})`
          ctx.beginPath()
          ctx.arc(cx, cy, ringR, a0, a1)
          ctx.stroke()
        }
      }

      // Orbiting particles
      const speedMult =
        stateNow === 'listening'
          ? 2
          : stateNow === 'thinking'
            ? 2.6
            : stateNow === 'speaking'
              ? 1.5
              : 0.85
      ctx.globalCompositeOperation = 'lighter'
      for (const p of particlesRef.current) {
        const dir = p.layer % 2 === 0 ? 1 : -1
        const ang = p.angle + t * p.speed * speedMult * dir
        const dist = R * p.dist * (1 + p.layer * 0.08) + audio * R * 0.18
        const x = cx + Math.cos(ang) * dist
        const y = cy + Math.sin(ang) * dist * 0.94
        const tw = 0.5 + 0.5 * Math.sin(t * 3 + p.twinkle)
        const alpha = (0.2 + p.layer * 0.12 + audio * 0.4) * tw
        const pr = p.size * (2.2 + audio * 1.2) * dpr
        const g = ctx.createRadialGradient(x, y, 0, x, y, pr)
        g.addColorStop(0, `hsla(${h1 + p.hueOff}, 100%, 88%, ${alpha})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(x, y, pr, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      // Glass core
      const coreG = ctx.createRadialGradient(
        cx,
        cy - R * 0.18,
        R * 0.02,
        cx,
        cy,
        R * 1.08,
      )
      coreG.addColorStop(0, `hsla(${h1}, 100%, 96%, 1)`)
      coreG.addColorStop(0.2, `hsla(${h2}, 96%, 72%, 0.9)`)
      coreG.addColorStop(0.5, `hsla(${h3}, 92%, 48%, 0.65)`)
      coreG.addColorStop(0.78, `hsla(${h1}, 85%, 28%, 0.4)`)
      coreG.addColorStop(1, 'transparent')
      ctx.fillStyle = coreG
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.04, 0, Math.PI * 2)
      ctx.fill()

      // Specular highlight
      const hi = ctx.createRadialGradient(
        cx - R * 0.38,
        cy - R * 0.42,
        0,
        cx - R * 0.1,
        cy - R * 0.1,
        R * 0.95,
      )
      hi.addColorStop(0, 'rgba(255,255,255,0.62)')
      hi.addColorStop(0.12, 'rgba(240,225,255,0.28)')
      hi.addColorStop(0.4, 'rgba(140,100,220,0.06)')
      hi.addColorStop(1, 'transparent')
      ctx.fillStyle = hi
      ctx.beginPath()
      ctx.arc(cx, cy, R, 0, Math.PI * 2)
      ctx.fill()

      // Rim
      const rimG = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R)
      rimG.addColorStop(0, `hsla(${h2}, 100%, 82%, 0.55)`)
      rimG.addColorStop(0.5, `hsla(${h1}, 100%, 92%, 0.7)`)
      rimG.addColorStop(1, `hsla(${h3}, 100%, 70%, 0.45)`)
      ctx.strokeStyle = rimG
      ctx.lineWidth = 2.5 * dpr
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.99, 0, Math.PI * 2)
      ctx.stroke()

      if (!reducedNow) {
        if (stateNow === 'listening') {
          const bars = 24
          const innerR = R * 1.12
          const outerR = R * 1.12 + (10 + audio * 28) * dpr
          for (let i = 0; i < bars; i++) {
            const a = (i / bars) * Math.PI * 2 - Math.PI / 2
            const wiggle = Math.sin(t * 9 + i * 0.55) * 4 * dpr
            const r0 = innerR + wiggle
            const r1 = outerR + wiggle + Math.sin(t * 7 + i) * 3 * dpr
            const x0 = cx + Math.cos(a) * r0
            const y0 = cy + Math.sin(a) * r0 * 0.94
            const x1 = cx + Math.cos(a) * r1
            const y1 = cy + Math.sin(a) * r1 * 0.94
            ctx.strokeStyle = `hsla(${h3 + (i % 5) * 4}, 100%, 78%, ${0.55 + audio * 0.35})`
            ctx.lineWidth = 2 * dpr
            ctx.lineCap = 'round'
            ctx.beginPath()
            ctx.moveTo(x0, y0)
            ctx.lineTo(x1, y1)
            ctx.stroke()
          }
        }

        if (stateNow === 'speaking') {
          for (let rip = 0; rip < 3; rip++) {
            const phase = (t * 1.35 + rip * 0.28) % 1
            const ripR = R * (1.02 + phase * 1.05)
            ctx.strokeStyle = `hsla(${h1}, 100%, 78%, ${(1 - phase) * 0.38})`
            ctx.lineWidth = (2 - rip * 0.3) * dpr
            ctx.beginPath()
            ctx.arc(cx, cy, ripR, 0, Math.PI * 2)
            ctx.stroke()
          }
        }

        if (stateNow === 'thinking') {
          for (let i = 0; i < 3; i++) {
            const a = t * 2.8 + (i * Math.PI * 2) / 3
            const orbitR = R * 0.58
            const x = cx + Math.cos(a) * orbitR
            const y = cy + Math.sin(a) * orbitR * 0.94
            const dotR = (3.5 + Math.sin(t * 4 + i) * 0.8) * dpr
            const dg = ctx.createRadialGradient(x, y, 0, x, y, dotR * 2)
            dg.addColorStop(0, `hsla(${h3 + i * 18}, 100%, 88%, 1)`)
            dg.addColorStop(1, 'transparent')
            ctx.fillStyle = dg
            ctx.beginPath()
            ctx.arc(x, y, dotR * 2, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      raf = requestAnimationFrame(draw)
    }

    draw(performance.now())
    return () => {
      running = false
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(raf)
    }
  }, [size, reduced])

  return <canvas ref={canvasRef} className="relative z-10 block" aria-hidden />
}
