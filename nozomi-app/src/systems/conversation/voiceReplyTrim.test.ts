import { describe, expect, it } from 'vitest'
import { trimForVoiceReply } from '@/systems/conversation/voiceReplyTrim'

describe('trimForVoiceReply', () => {
  it('leaves short replies unchanged', () => {
    const t = { jp: '元気？', romaji: '', en: '' }
    expect(trimForVoiceReply(t).jp).toBe('元気？')
  })

  it('truncates very long jp', () => {
    const t = { jp: 'あ'.repeat(200), romaji: '', en: '' }
    expect(trimForVoiceReply(t).jp.length).toBeLessThanOrEqual(121)
  })
})
