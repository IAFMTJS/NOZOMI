import { beforeEach, describe, expect, it } from 'vitest'
import {
  getVoiceSessionPhase,
  resetVoiceSessionFsm,
  transitionVoiceSession,
} from '@/features/voice/logic/voiceSessionFsm'
import { useUiStore } from '@/store/useUiStore'

describe('voiceSessionFsm', () => {
  beforeEach(() => {
    useUiStore.getState().resetVoiceUi()
    resetVoiceSessionFsm('test-reset')
  })

  it('keeps orb idle during permission request', () => {
    transitionVoiceSession('requesting_permission', 'test', { force: true })
    expect(getVoiceSessionPhase()).toBe('requesting_permission')
    expect(useUiStore.getState().orbState).toBe('idle')
  })

  it('moves to listening when capturing', () => {
    transitionVoiceSession('requesting_permission', 'test', { force: true })
    transitionVoiceSession('listening', 'test', { force: true })
    expect(useUiStore.getState().orbState).toBe('listening')
  })

  it('blocks illegal backwards jump without force', () => {
    transitionVoiceSession('listening', 'test', { force: true })
    transitionVoiceSession('requesting_permission', 'test')
    expect(getVoiceSessionPhase()).toBe('listening')
  })
})
