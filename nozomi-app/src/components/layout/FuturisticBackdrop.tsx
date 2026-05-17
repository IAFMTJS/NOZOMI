/** Global ambient layer: grid, vignette, subtle scanlines */
export function FuturisticBackdrop() {
  return (
    <div className="futuristic-backdrop pointer-events-none fixed inset-0 z-0" aria-hidden>
      <div className="futuristic-grid" />
      <div className="futuristic-vignette" />
      <div className="futuristic-scanlines" />
    </div>
  )
}
