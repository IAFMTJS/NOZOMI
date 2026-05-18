import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  NOZOMI_VOICE_AUTO,
  pickJapaneseVoice,
  scoreJapaneseVoice,
} from '@/features/voice/logic/japaneseVoicePicker'

function mockVoice(
  partial: Partial<SpeechSynthesisVoice> & Pick<SpeechSynthesisVoice, 'name' | 'lang'>,
): SpeechSynthesisVoice {
  return {
    voiceURI: partial.voiceURI ?? partial.name,
    default: false,
    localService: false,
    ...partial,
  } as SpeechSynthesisVoice
}

describe('scoreJapaneseVoice', () => {
  it('prefers Kyoko Enhanced over compact Japanese', () => {
    const kyoko = mockVoice({
      name: 'Kyoko (Enhanced)',
      lang: 'ja-JP',
      localService: true,
    })
    const compact = mockVoice({
      name: 'Kyoko (Compact)',
      lang: 'ja-JP',
      localService: true,
    })
    expect(scoreJapaneseVoice(kyoko)).toBeGreaterThan(scoreJapaneseVoice(compact))
  })

  it('prefers Nanami Natural over generic male', () => {
    const nanami = mockVoice({
      name: 'Microsoft Nanami Online (Natural) - Japanese (Japan)',
      lang: 'ja-JP',
    })
    const ichiro = mockVoice({
      name: 'Microsoft Ichiro - Japanese (Japan)',
      lang: 'ja-JP',
    })
    expect(scoreJapaneseVoice(nanami)).toBeGreaterThan(scoreJapaneseVoice(ichiro))
  })

  it('rejects non-Japanese voices', () => {
    const en = mockVoice({ name: 'Samantha', lang: 'en-US' })
    expect(scoreJapaneseVoice(en)).toBeLessThan(0)
  })
})

describe('pickJapaneseVoice', () => {
  const voices = [
    mockVoice({
      name: 'Kyoko (Compact)',
      lang: 'ja-JP',
      voiceURI: 'compact',
      localService: true,
    }),
    mockVoice({
      name: 'Kyoko (Enhanced)',
      lang: 'ja-JP',
      voiceURI: 'enhanced',
      localService: true,
    }),
    mockVoice({
      name: 'Microsoft Ichiro',
      lang: 'ja-JP',
      voiceURI: 'ichiro',
    }),
  ]

  beforeEach(() => {
    vi.stubGlobal('window', {
      speechSynthesis: {
        getVoices: () => voices,
      },
    })
  })

  it('picks highest-scored voice on auto', () => {
    expect(pickJapaneseVoice(NOZOMI_VOICE_AUTO)?.voiceURI).toBe('enhanced')
  })

  it('honours explicit voice URI', () => {
    expect(pickJapaneseVoice('ichiro')?.name).toContain('Ichiro')
  })
})
