import type { OrbState } from '@/types/domain'

export interface OrbPalette {
  h1: number
  h2: number
  h3: number
  /** CSS color stops for waveform / accents */
  waveFrom: string
  waveMid: string
  waveTo: string
  glowRgb: string
  ringRgb: string
}

export const ORB_PALETTES: Record<OrbState, OrbPalette> = {
  idle: {
    h1: 275,
    h2: 248,
    h3: 218,
    waveFrom: '#6366f1',
    waveMid: '#8b5cf6',
    waveTo: '#c084fc',
    glowRgb: '168, 85, 247',
    ringRgb: '34, 211, 238',
  },
  listening: {
    h1: 268,
    h2: 198,
    h3: 172,
    waveFrom: '#22d3ee',
    waveMid: '#6366f1',
    waveTo: '#a855f7',
    glowRgb: '34, 211, 238',
    ringRgb: '129, 140, 248',
  },
  thinking: {
    h1: 252,
    h2: 228,
    h3: 198,
    waveFrom: '#fbbf24',
    waveMid: '#a78bfa',
    waveTo: '#e879f9',
    glowRgb: '251, 191, 36',
    ringRgb: '192, 132, 252',
  },
  speaking: {
    h1: 288,
    h2: 258,
    h3: 220,
    waveFrom: '#e879f9',
    waveMid: '#a855f7',
    waveTo: '#818cf8',
    glowRgb: '232, 121, 249',
    ringRgb: '168, 85, 247',
  },
}

export function getOrbPalette(state: OrbState): OrbPalette {
  return ORB_PALETTES[state]
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpOrbPalette(
  from: OrbPalette,
  to: OrbPalette,
  t: number,
): OrbPalette {
  const u = Math.max(0, Math.min(1, t))
  return {
    h1: lerp(from.h1, to.h1, u),
    h2: lerp(from.h2, to.h2, u),
    h3: lerp(from.h3, to.h3, u),
    waveFrom: u < 0.5 ? from.waveFrom : to.waveFrom,
    waveMid: u < 0.5 ? from.waveMid : to.waveMid,
    waveTo: u < 0.5 ? from.waveTo : to.waveTo,
    glowRgb: u < 0.5 ? from.glowRgb : to.glowRgb,
    ringRgb: u < 0.5 ? from.ringRgb : to.ringRgb,
  }
}

export function applyOrbPaletteToRoot(
  palette: OrbPalette,
  audioLevel: number,
  intensity: number,
  state: OrbState,
): void {
  const root = document.documentElement
  root.dataset.orbState = state
  root.style.setProperty('--orb-h1', String(Math.round(palette.h1)))
  root.style.setProperty('--orb-h2', String(Math.round(palette.h2)))
  root.style.setProperty('--orb-h3', String(Math.round(palette.h3)))
  root.style.setProperty('--orb-glow-rgb', palette.glowRgb)
  root.style.setProperty('--orb-ring-rgb', palette.ringRgb)
  root.style.setProperty('--orb-wave-from', palette.waveFrom)
  root.style.setProperty('--orb-wave-mid', palette.waveMid)
  root.style.setProperty('--orb-wave-to', palette.waveTo)
  root.style.setProperty('--orb-audio-level', audioLevel.toFixed(4))
  root.style.setProperty('--orb-intensity', String(intensity))
}

export function clearOrbPaletteFromRoot(): void {
  const root = document.documentElement
  delete root.dataset.orbState
  for (const key of [
    '--orb-h1',
    '--orb-h2',
    '--orb-h3',
    '--orb-glow-rgb',
    '--orb-ring-rgb',
    '--orb-wave-from',
    '--orb-wave-mid',
    '--orb-wave-to',
    '--orb-audio-level',
    '--orb-intensity',
  ]) {
    root.style.removeProperty(key)
  }
}
