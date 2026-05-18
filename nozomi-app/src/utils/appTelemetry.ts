export type AppTelemetryEventName =
  | 'data_load_failed'
  | 'data_load_retry_failed'
  | 'data_load_recovered'

export interface AppTelemetryEvent {
  name: AppTelemetryEventName
  at: string
  detail?: string
}

type TelemetrySink = (event: AppTelemetryEvent) => void

const STORAGE_KEY = 'nozomi.telemetry.v1'
const MAX_EVENTS = 32

let sinks: TelemetrySink[] = []

/** Optional external sink (analytics, error reporting). */
export function registerTelemetrySink(sink: TelemetrySink): () => void {
  sinks.push(sink)
  return () => {
    sinks = sinks.filter((s) => s !== sink)
  }
}

function persistEvent(event: AppTelemetryEvent): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const prev = raw ? (JSON.parse(raw) as AppTelemetryEvent[]) : []
    const next = [...prev, event].slice(-MAX_EVENTS)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* private mode / quota */
  }
}

export function getTelemetryBuffer(): AppTelemetryEvent[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as AppTelemetryEvent[]
  } catch {
    return []
  }
}

/** Lightweight product diagnostics — no third-party SDK required. */
export function trackAppEvent(
  name: AppTelemetryEventName,
  detail?: string,
): void {
  const event: AppTelemetryEvent = {
    name,
    at: new Date().toISOString(),
    ...(detail ? { detail: detail.slice(0, 500) } : {}),
  }
  persistEvent(event)
  if (import.meta.env.DEV) {
    console.warn('[Nozomi:telemetry]', event)
  }
  for (const sink of sinks) {
    try {
      sink(event)
    } catch {
      /* sink must not break app */
    }
  }
}
