/**
 * Canonical shapes for expanding NOZOMI's local language database.
 * Add high-quality rows to `seedData.ts` and/or `public/data/sentences.json`
 * using these fields — the matcher scores jp / romaji / en against user input.
 *
 * Before import: `npm run validate-sentences -- --file path/to/batch.json`
 * After editing seeds: `npm run validate-seed`
 *
 * JMdict bulk import: `npm run import-jmdict` (tap lookup via lexicon.json)
 */

import type { ResponseHint } from '@/systems/conversation/responseHints'
import type { Sentence } from '@/types/domain'

/** One conversational reply line (companion-style, not textbook narration). */
export const SENTENCE_RECORD_EXAMPLE: Sentence = {
  id: 0,
  jp: 'この電車は新宿行きですか？',
  romaji: 'Kono densha wa Shinjuku yuki desu ka?',
  en: 'Is this train bound for Shinjuku?',
  category: 'train_station',
  jlptLevel: 'N5',
  grammarTags: '',
}

/** Boost rules: user input pattern → preferred reply fragments. */
export const RESPONSE_HINT_EXAMPLE = {
  re: /(ticket|切符|きっぷ)/i,
  jpHints: ['切符', '券', '購入'],
  enHints: ['ticket', 'buy', 'fare'],
} satisfies ResponseHint
