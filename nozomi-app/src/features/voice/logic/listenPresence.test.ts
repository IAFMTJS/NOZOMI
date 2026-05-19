import { beforeEach, describe, expect, it } from 'vitest'
import {
  enterVoiceCapturing,
  enterVoiceGenerating,
  enterVoiceListenPrepare,
  enterVoiceResponding,
} from '@/features/voice/logic/voiceTurnCoordinator'
import { useUiStore } from '@/store/useUiStore'
import {
  deriveListenPhase,
  derivePresenceOrbState,
  isPresenceBusy,
} from './listenPresence'

describe('derivePresenceOrbState', () => {
  beforeEach(() => {
    useUiStore.getState().resetVoiceUi()
  })

  it('keeps orb idle while requesting permission', () => {
    enterVoiceListenPrepare()
    expect(derivePresenceOrbState()).toBe('idle')
  })

  it('maps listening to listening orb', () => {
    enterVoiceCapturing()
    expect(derivePresenceOrbState()).toBe('listening')
  })

  it('maps thinking to thinking orb', () => {
    enterVoiceGenerating()
    expect(derivePresenceOrbState()).toBe('thinking')
  })

  it('maps responding to speaking orb', () => {
    enterVoiceResponding()
    expect(derivePresenceOrbState()).toBe('speaking')
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
