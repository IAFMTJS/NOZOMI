import { beforeEach, describe, expect, it } from 'vitest'
import {
  deriveVoiceTurnPhase,
  enterVoiceCapturing,
  enterVoiceGenerating,
  forceRecoverVoiceUi,
  syncIdleAfterVoiceTurn,
} from '@/features/voice/logic/voiceTurnCoordinator'
import { useUiStore } from '@/store/useUiStore'

describe('voiceTurnCoordinator', () => {
  beforeEach(() => {
    useUiStore.getState().resetVoiceUi()
  })

  it('enters capturing phase', () => {
    enterVoiceCapturing()
    expect(useUiStore.getState().speechState).toBe('listening')
    expect(deriveVoiceTurnPhase()).toBe('capturing')
  })

  it('recovers orphan processing UI', () => {
    useUiStore.getState().setSpeechState('processing')
    useUiStore.getState().setTranscriptFinalizing(true)
    forceRecoverVoiceUi('test')
    expect(useUiStore.getState().speechState).toBe('idle')
    expect(useUiStore.getState().transcriptFinalizing).toBe(false)
  })

  it('syncIdleAfterVoiceTurn clears processing', () => {
    enterVoiceGenerating()
    syncIdleAfterVoiceTurn({ clearTranscriptDelayMs: 0 })
    expect(useUiStore.getState().speechState).toBe('idle')
    expect(useUiStore.getState().orbState).toBe('idle')
  })
})
