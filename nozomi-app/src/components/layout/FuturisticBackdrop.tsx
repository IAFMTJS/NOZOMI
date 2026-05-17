const PARTICLES = [
  { left: '12%', top: '18%', delay: '0s', dur: '16s' },
  { left: '78%', top: '24%', delay: '2s', dur: '20s' },
  { left: '45%', top: '72%', delay: '4s', dur: '18s' },
  { left: '88%', top: '58%', delay: '1s', dur: '22s' },
  { left: '22%', top: '62%', delay: '3s', dur: '19s' },
  { left: '62%', top: '12%', delay: '5s', dur: '17s' },
  { left: '35%', top: '38%', delay: '6s', dur: '21s' },
  { left: '92%', top: '82%', delay: '2.5s', dur: '23s' },
]

/** Global ambient layer: grid, vignette, subtle living particles */
export function FuturisticBackdrop() {
  return (
    <div className="futuristic-backdrop pointer-events-none fixed inset-0 z-0" aria-hidden>
      <div className="futuristic-radial-glow" />
      <div className="futuristic-grid" />
      <div className="futuristic-vignette" />
      <div className="futuristic-scanlines" />
      <div className="futuristic-particles">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="futuristic-particle"
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.dur,
            }}
          />
        ))}
      </div>
    </div>
  )
}
