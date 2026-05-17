import { useMemo } from 'react'
import { getDevNetworkUrls, isDesktopLocalhost, pickPhoneDevUrl } from '@/utils/devConnect'

export function DevConnectBanner() {
  const phoneUrl = useMemo(() => pickPhoneDevUrl(), [])
  const allUrls = useMemo(() => getDevNetworkUrls(), [])

  if (!import.meta.env.DEV) return null
  if (!isDesktopLocalhost() || !phoneUrl) return null

  const copy = () => {
    void navigator.clipboard?.writeText(phoneUrl)
  }

  return (
    <div
      className="relative z-50 shrink-0 border-b border-nozomi-cyan/30 bg-nozomi-bg-elevated/95 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-center text-xs text-nozomi-muted backdrop-blur-sm"
      role="note"
    >
      <p className="text-nozomi-cyan font-medium">Phone testing</p>
      <p className="mt-0.5 break-all">
        Open on your phone (same Wi‑Fi):{' '}
        <a href={phoneUrl} className="text-nozomi-text underline">
          {phoneUrl}
        </a>
      </p>
      <p className="mt-1 text-[10px] opacity-80">
        Accept the HTTPS certificate warning. Do not use localhost on your phone.
      </p>
      {allUrls.length > 1 && (
        <p className="mt-1 text-[10px] opacity-70">
          Also: {allUrls.filter((u) => u !== phoneUrl).join(' · ')}
        </p>
      )}
      <button
        type="button"
        onClick={copy}
        className="mt-2 touch-manipulation rounded-lg border border-nozomi-border/40 px-3 py-1.5 text-nozomi-text hover:bg-nozomi-surface/60"
      >
        Copy phone URL
      </button>
    </div>
  )
}
