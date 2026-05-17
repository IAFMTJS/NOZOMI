import type { WhisperModelTier } from '@/types/domain'

const TINY_EN = 'Xenova/whisper-tiny.en'
const TINY_MULTI = 'Xenova/whisper-tiny'
const SMALL_EN = 'Xenova/whisper-small.en'
const SMALL_MULTI = 'Xenova/whisper-small'

export function resolveWhisperModelId(
  bcp47: string,
  tier: WhisperModelTier,
): string {
  const en = bcp47 === 'en-US'
  if (tier === 'small') return en ? SMALL_EN : SMALL_MULTI
  return en ? TINY_EN : TINY_MULTI
}
