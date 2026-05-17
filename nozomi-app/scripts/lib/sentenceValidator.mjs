/**
 * Shared rules for NOZOMI sentence records (JSON export + seed data).
 * @see src/data/languageDatabase.ts
 */

export const JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1']

export const SCENARIO_CATEGORIES = [
  'train_station',
  'hotel',
  'dating',
  'classroom',
]

/** Categories seen in exports + scenario intents — unknown values warn only. */
export const KNOWN_CATEGORIES = [
  ...SCENARIO_CATEGORIES,
  'business',
  'daily',
  'emergency',
  'emotion',
  'fandom',
  'food',
  'greeting',
  'health',
  'hobby',
  'home',
  'immersion',
  'introduction',
  'opinion',
  'plans',
  'polite',
  'question',
  'restaurant',
  'shopping',
  'social',
  'study',
  'tech',
  'travel',
  'weather',
  'work',
]

export const LIMITS = {
  /** Hard cap — companion lines should stay short. */
  jpMaxChars: 72,
  /** Prefer under this for natural back-and-forth. */
  jpWarnChars: 48,
  enWarnChars: 140,
  romajiWarnChars: 120,
}

const CATEGORY_RE = /^[a-z][a-z0-9_]*$/
const THIRD_PERSON_RE = /(彼は|彼女は|彼ら|彼の|彼女の)/
const REQUIRED_FIELDS = ['id', 'jp', 'romaji', 'en', 'category', 'jlptLevel']

function isCompanionCategory(category) {
  return (
    SCENARIO_CATEGORIES.includes(category) ||
    category === 'greeting' ||
    category === 'daily'
  )
}

function looksCompressedRomaji(jp, romaji) {
  const j = jp?.trim() ?? ''
  const r = romaji?.trim() ?? ''
  return j.length > 6 && r.length > 12 && !r.includes(' ') && /[a-z]/i.test(r)
}

/**
 * @param {unknown} record
 * @param {number} index
 * @param {{ source?: string, qualityChecks?: boolean }} [options]
 */
export function validateSentenceRecord(record, index, options = {}) {
  const source = options.source ?? 'sentences'
  const label = `${source}[${index}]`
  const errors = []
  const warnings = []
  const quality = options.qualityChecks !== false

  if (!record || typeof record !== 'object') {
    return {
      id: null,
      errors: [`${label}: not an object`],
      warnings: [],
    }
  }

  const row = /** @type {Record<string, unknown>} */ (record)
  const id = row.id

  for (const field of REQUIRED_FIELDS) {
    if (row[field] === undefined || row[field] === null) {
      errors.push(`${label} id=${id ?? '?'}: missing required field "${field}"`)
    }
  }

  if (typeof id !== 'number' || !Number.isInteger(id) || id < 0) {
    errors.push(`${label}: "id" must be a non-negative integer`)
  }

  const jp = typeof row.jp === 'string' ? row.jp.trim() : ''
  const romaji = typeof row.romaji === 'string' ? row.romaji.trim() : ''
  const en = typeof row.en === 'string' ? row.en.trim() : ''
  const category =
    typeof row.category === 'string' ? row.category.trim() : ''
  const jlptLevel =
    typeof row.jlptLevel === 'string' ? row.jlptLevel.trim() : ''

  if (!jp) {
    errors.push(`${label} id=${id}: "jp" must be non-empty`)
  } else {
    if (jp.length > LIMITS.jpMaxChars) {
      errors.push(
        `${label} id=${id}: jp too long (${jp.length} > ${LIMITS.jpMaxChars}) — use a shorter companion line`,
      )
    } else if (quality && jp.length > LIMITS.jpWarnChars) {
      warnings.push(
        `${label} id=${id}: jp is long (${jp.length} chars) — prefer ≤ ${LIMITS.jpWarnChars} for conversation`,
      )
    }
  }

  if (!romaji && jp) {
    warnings.push(`${label} id=${id}: missing romaji`)
  } else if (quality && romaji.length > LIMITS.romajiWarnChars) {
    warnings.push(`${label} id=${id}: romaji is very long`)
  } else if (quality && looksCompressedRomaji(jp, romaji)) {
    warnings.push(
      `${label} id=${id}: romaji looks compressed (no spaces) — run fill-romaji or fix manually`,
    )
  }

  if (!en && jp) {
    warnings.push(`${label} id=${id}: missing en`)
  } else if (quality && en.length > LIMITS.enWarnChars) {
    warnings.push(`${label} id=${id}: en is very long`)
  }

  if (!category) {
    errors.push(`${label} id=${id}: "category" must be non-empty`)
  } else {
    if (!CATEGORY_RE.test(category)) {
      errors.push(
        `${label} id=${id}: category "${category}" must be snake_case (e.g. train_station)`,
      )
    }
    if (!KNOWN_CATEGORIES.includes(category)) {
      warnings.push(
        `${label} id=${id}: unknown category "${category}" — add to KNOWN_CATEGORIES if intentional`,
      )
    }
  }

  if (!JLPT_LEVELS.includes(jlptLevel)) {
    errors.push(
      `${label} id=${id}: jlptLevel must be one of ${JLPT_LEVELS.join(', ')}`,
    )
  }

  if (row.grammarTags !== undefined && typeof row.grammarTags !== 'string') {
    errors.push(`${label} id=${id}: grammarTags must be a string when present`)
  }

  if (quality && isCompanionCategory(category)) {
    if (THIRD_PERSON_RE.test(jp)) {
      warnings.push(
        `${label} id=${id}: third-person narration (彼は/彼女は…) — prefer companion-style lines`,
      )
    }
    if (/した。$/.test(jp) && jp.length > 20 && THIRD_PERSON_RE.test(jp)) {
      warnings.push(`${label} id=${id}: reads like textbook narration, not dialogue`)
    }
  }

  return { id, errors, warnings }
}

/**
 * @param {unknown[]} records
 * @param {{
 *   source?: string
 *   qualityChecks?: boolean
 *   companionQualityOnly?: boolean
 * }} [options]
 */
export function validateSentenceBatch(records, options = {}) {
  const issues = []
  const seenIds = new Map()
  let errorCount = 0
  let warningCount = 0

  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    const category =
      row && typeof row === 'object' && typeof row.category === 'string'
        ? row.category.trim()
        : ''

    const runQuality =
      options.qualityChecks !== false &&
      (!options.companionQualityOnly || isCompanionCategory(category))

    const result = validateSentenceRecord(row, i, {
      source: options.source,
      qualityChecks: runQuality,
    })

    if (typeof result.id === 'number') {
      if (seenIds.has(result.id)) {
        const prev = seenIds.get(result.id)
        errorCount++
        issues.push({
          id: result.id,
          errors: [
            `${options.source ?? 'sentences'}[${i}]: duplicate id ${result.id} (also at index ${prev})`,
          ],
          warnings: [],
        })
      } else {
        seenIds.set(result.id, i)
      }
    }

    if (result.errors.length || result.warnings.length) {
      errorCount += result.errors.length
      warningCount += result.warnings.length
      if (result.errors.length || result.warnings.length) {
        issues.push(result)
      }
    }
  }

  return {
    total: records.length,
    errorCount,
    warningCount,
    issues,
    uniqueIds: seenIds.size,
  }
}

/**
 * @param {unknown} payload
 */
export function extractSentenceRows(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object' && Array.isArray(payload.sentences)) {
    return payload.sentences
  }
  throw new Error('Expected { sentences: [...] } or a bare array')
}
