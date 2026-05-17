import { useOrbAudioLevel } from '@/hooks/useOrbAudioLevel'
import { isMobileDevice } from '@/utils/device'

interface Props {
  bars?: number
  className?: string
  tall?: boolean
}

export function WaveformStrip({ bars = 48, className = '', tall = false }: Props) {
  const level = useOrbAudioLevel()
  const barCount = isMobileDevice() ? Math.min(bars, 32) : bars
  const h = tall ? 56 : 48
  return (
    <div
      className={`flex w-full max-w-lg items-end justify-center gap-[3px] px-6 ${className}`}
      style={{ height: h }}
      aria-hidden
    >
      {Array.from({ length: barCount }).map((_, i) => {
        const wave = 0.45 + Math.sin(i * 0.35) * 0.35 + Math.cos(i * 0.12) * 0.2
        const barH = 6 + level * (tall ? 44 : 36) * wave
        return (
          <div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: `${barH}px`,
              background:
                'linear-gradient(to top, #3b82f6 0%, #6366f1 40%, #a855f7 100%)',
              boxShadow:
                level > 0.1
                  ? `0 0 ${4 + level * 8}px rgba(168,85,247,0.5)`
                  : undefined,
              opacity: 0.5 + level * 0.5,
            }}
          />
        )
      })}
    </div>
  )
}
