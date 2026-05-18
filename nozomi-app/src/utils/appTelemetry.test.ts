import { describe, it, expect, beforeEach } from 'vitest'
import {
  getTelemetryBuffer,
  registerTelemetrySink,
  trackAppEvent,
} from '@/utils/appTelemetry'

describe('appTelemetry', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('persists events to sessionStorage', () => {
    trackAppEvent('data_load_failed', 'network error')
    const buf = getTelemetryBuffer()
    expect(buf).toHaveLength(1)
    expect(buf[0]?.name).toBe('data_load_failed')
    expect(buf[0]?.detail).toBe('network error')
  })

  it('notifies registered sinks', () => {
    const seen: string[] = []
    const off = registerTelemetrySink((e) => seen.push(e.name))
    trackAppEvent('data_load_recovered')
    off()
    expect(seen).toEqual(['data_load_recovered'])
  })
})
