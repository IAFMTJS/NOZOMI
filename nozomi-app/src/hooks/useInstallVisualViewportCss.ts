import { useEffect } from 'react'

/** Publishes --app-vh and keyboard offset for iOS Safari layout. */
export function useInstallVisualViewportCss(): void {
  useEffect(() => {
    const root = document.documentElement
    const apply = () => {
      const vv = window.visualViewport
      const height = vv?.height ?? window.innerHeight
      const offsetTop = vv?.offsetTop ?? 0
      root.style.setProperty('--app-vh', `${Math.round(height)}px`)
      root.style.setProperty('--vv-offset-top', `${Math.round(offsetTop)}px`)
      const keyboard = Math.max(0, window.innerHeight - height - offsetTop)
      root.style.setProperty('--keyboard-inset', `${Math.round(keyboard)}px`)
    }
    apply()
    const vv = window.visualViewport
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    return () => {
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
    }
  }, [])
}
