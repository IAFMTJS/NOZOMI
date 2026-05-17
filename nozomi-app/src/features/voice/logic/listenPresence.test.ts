import { describe, expect, it } from 'vitest'
import {
  deriveListenPhase,
  derivePresenceOrbState,
  isPresenceBusy,
} from './listenPresence'

describe('derivePresenceOrbState', () => {
  it('maps preparing and listening to listening orb', () => {
    expect(derivePresenceOrbState('permission_pending', 'idle')).toBe('listening')
    expect(derivePresenceOrbState('listening', 'idle')).toBe('listening')
  })

  it('maps processing to thinking orb', () => {
    expect(derivePresenceOrbState('processing', 'listening')).toBe('thinking')
  })

  it('keeps speaking when orb is speaking', () => {
    expect(derivePresenceOrbState('idle', 'speaking')).toBe('speaking')
    expect(derivePresenceOrbState('speaking', 'idle')).toBe('speaking')
  })
})

describe('deriveListenPhase', () => {
  it('tracks preparing vs capturing', () => {
    expect(deriveListenPhase('permission_pending', 'idle')).toBe('preparing')
    expect(deriveListenPhase('listening', 'listening')).toBe('capturing')
    expect(deriveListenPhase('processing', 'thinking')).toBe('processing')
  })

  it('distinguishes finalizing from engine processing', () => {
    expect(deriveListenPhase('processing', 'thinking', true)).toBe('finalizing')
    expect(deriveListenPhase('processing', 'thinking', false)).toBe('processing')
  })
})

describe('isPresenceBusy', () => {
  it('is busy during prep, finalize, and processing', () => {
    expect(isPresenceBusy('permission_pending', false)).toBe(true)
    expect(isPresenceBusy('processing', true)).toBe(true)
    expect(isPresenceBusy('processing', false)).toBe(true)
    expect(isPresenceBusy('idle', false)).toBe(false)
  })
})
