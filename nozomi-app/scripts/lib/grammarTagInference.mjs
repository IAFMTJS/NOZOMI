/**
 * Infer comma-separated grammarTags from Japanese surface forms.
 * Tokens are matched loosely by findGrammarForTags() against grammar.json patterns.
 */

/** @type {{ id: string, test: (jp: string) => boolean, priority: number }[]} */
const RULES = [
  { id: 'question', test: (jp) => /[?？]$/.test(jp) || /ですか|ますか|でしょうか|かな$/.test(jp), priority: 10 },
  { id: 'desu-masu', test: (jp) => /です|ます|でした|ました|ません|ませんでした/.test(jp), priority: 9 },
  { id: 'te-form', test: (jp) => /てください|ている|ています|てくれ|てあげ|てみ|てから|ても|ては/.test(jp), priority: 8 },
  { id: 'volitional', test: (jp) => /しよう|しましょう|おう|ましょう/.test(jp), priority: 8 },
  { id: 'past-tense', test: (jp) => /った|いた|した|だった|でした|ました|かった/.test(jp), priority: 7 },
  { id: 'desire-tai', test: (jp) => /たい|たくない|たかった/.test(jp), priority: 7 },
  { id: 'potential', test: (jp) => /できる|られます|えます|できません/.test(jp), priority: 7 },
  { id: 'particle-wa', test: (jp) => /は/.test(jp), priority: 5 },
  { id: 'particle-ga', test: (jp) => /が/.test(jp), priority: 5 },
  { id: 'particle-wo', test: (jp) => /を/.test(jp), priority: 5 },
  { id: 'particle-ni', test: (jp) => /に/.test(jp), priority: 5 },
  { id: 'particle-de', test: (jp) => /で/.test(jp), priority: 5 },
  { id: 'particle-to', test: (jp) => /と/.test(jp), priority: 4 },
  { id: 'particle-kara', test: (jp) => /から/.test(jp), priority: 4 },
  { id: 'particle-made', test: (jp) => /まで/.test(jp), priority: 4 },
  { id: 'particle-no', test: (jp) => /の/.test(jp), priority: 3 },
  { id: 'comparison', test: (jp) => /より|ほうが|一番/.test(jp), priority: 6 },
  { id: 'because-node', test: (jp) => /ので|からです/.test(jp), priority: 6 },
  { id: 'but-kedo', test: (jp) => /けど|けれど|でも/.test(jp), priority: 5 },
  { id: 'existential-aru', test: (jp) => /があります|がありません/.test(jp), priority: 6 },
  { id: 'existential-iru', test: (jp) => /がいます|がいません|ています/.test(jp), priority: 6 },
  { id: 'polite-request', test: (jp) => /ください|お願い/.test(jp), priority: 7 },
  { id: 'progressive', test: (jp) => /ている|ています|てる/.test(jp), priority: 6 },
]

const MAX_TAGS = 4

/**
 * @param {string} jp
 * @returns {string}
 */
export function inferGrammarTags(jp) {
  const text = jp?.trim() ?? ''
  if (!text || text.length > 72) return ''

  const matched = RULES.filter((r) => r.test(text))
    .sort((a, b) => b.priority - a.priority)
    .map((r) => r.id)

  const unique = [...new Set(matched)]
  if (!unique.length) return ''

  return unique.slice(0, MAX_TAGS).join(',')
}

/**
 * @param {import('../../src/types/domain').Sentence} sentence
 */
export function shouldTagSentence(sentence) {
  const jp = sentence.jp?.trim() ?? ''
  if (!jp || jp.length > 72) return false
  if (sentence.grammarTags?.trim()) return false
  return true
}
