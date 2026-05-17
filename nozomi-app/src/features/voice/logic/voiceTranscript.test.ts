import { describe, expect, it } from 'vitest'
import { UI_LABELS } from '@/data/ui-labels'
import { isUiTranscriptPlaceholder, mergeHeardTranscript } from './voiceTranscript'

describe('voiceTranscript', () => {
  it('treats status strings as placeholders', () => {
    expect(isUiTranscriptPlaceholder(UI_LABELS.statusFinalizing.jp)).toBe(true)
    expect(isUiTranscriptPlaceholder('こんにちは')).toBe(false)
  })

  it('merges buffers without liveTranscript field', () => {
    expect(
      mergeHeardTranscript({
        lastRef: '',
        pendingInterim: '元気？',
        captured: '',
      }),
    ).toBe('元気？')
  })
})
