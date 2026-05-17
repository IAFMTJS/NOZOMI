import { UI_LABELS } from '@/data/ui-labels'
import type { LanguageText as LT } from '@/types/domain'

declare global {
  interface Window {
    __NOZOMI_DEV_URLS__?: string[]
  }
}

export function getDevNetworkUrls(): string[] {
  if (typeof window === 'undefined') return []
  return window.__NOZOMI_DEV_URLS__ ?? []
}

/** Prefer home Wi‑Fi (192.168.x) over VPN/tailscale-style addresses. */
export function pickPhoneDevUrl(): string | undefined {
  const urls = getDevNetworkUrls()
  const lan = urls.find((u) => /https?:\/\/192\.168\.\d+\.\d+/.test(u))
  return lan ?? urls[0]
}

export function isDesktopLocalhost(): boolean {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1'
}

export function micNeedsHttpsLabel(): LT {
  const url = pickPhoneDevUrl()
  if (!url) return UI_LABELS.micNeedsHttps
  return {
    ...UI_LABELS.micNeedsHttps,
    en: `On your phone (same Wi‑Fi), open ${url} and accept the certificate warning. Desktop can use https://localhost:5173.`,
    jp: `スマホ（同じWi‑Fi）で ${url} を開き、証明書の警告を許可してください。PCは https://localhost:5173 です。`,
    romaji: `Sumaho de ${url} wo hiraki, shoumeisho wo kyoka shite kudasai.`,
  }
}
