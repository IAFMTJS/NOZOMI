/**
 * Export nozomi.sqlite to public/data/*.json for browser ingestion.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const sqlitePath = path.resolve(root, '..', 'nozomi.sqlite')
const outDir = path.join(root, 'public', 'data')

mkdirSync(outDir, { recursive: true })

const py = `
import json, sqlite3, os
db = sqlite3.connect(r"${sqlitePath.replace(/\\/g, '\\\\')}")
db.row_factory = sqlite3.Row
out = r"${outDir.replace(/\\/g, '\\\\')}"

def export_sentences():
    cur = db.execute("""
        SELECT id, japanese, romaji, english, category, jlpt_level, grammar_tags
        FROM sentences
        ORDER BY RANDOM()
        LIMIT 8000
    """)
    rows = [{
        "id": r["id"],
        "jp": r["japanese"],
        "romaji": r["romaji"] or "",
        "en": r["english"] or "",
        "category": r["category"] or "daily",
        "jlptLevel": r["jlpt_level"] or "N5",
        "grammarTags": r["grammar_tags"] or ""
    } for r in cur.fetchall()]
    with open(os.path.join(out, "sentences.json"), "w", encoding="utf-8") as f:
        json.dump({"sentences": rows}, f, ensure_ascii=False)

def export_vocab():
    """Companion / lesson vocab only — JMdict lives in lexicon.json for tap lookup."""
    cur = db.execute("""
        SELECT id, hiragana, romaji, kanji, english, category, jlpt_level,
               example_japanese, example_romaji, example_english
        FROM vocabulary
        WHERE COALESCE(source, 'curated') != 'jmdict'
    """)
    rows = []
    for r in cur.fetchall():
        kanji = r["kanji"] or r["hiragana"]
        rows.append({
            "id": r["id"],
            "jp": kanji,
            "romaji": r["romaji"] or "",
            "en": r["english"] or r["dutch"] or "",
            "hiragana": r["hiragana"] or "",
            "kanji": r["kanji"],
            "category": r["category"] or "general",
            "jlptLevel": r["jlpt_level"] or "N5",
            "exampleJp": r["example_japanese"],
            "exampleRomaji": r["example_romaji"],
            "exampleEn": r["example_english"],
        })
    with open(os.path.join(out, "vocabulary.json"), "w", encoding="utf-8") as f:
        json.dump({"vocabulary": rows}, f, ensure_ascii=False)

def export_personality():
    cur = db.execute("""
        SELECT id, mode, japanese, romaji, english, context
        FROM personality_lines
    """)
    rows = [{
        "id": r["id"],
        "mode": r["mode"],
        "jp": r["japanese"],
        "romaji": r["romaji"] or "",
        "en": r["english"] or "",
        "context": r["context"] or "general"
    } for r in cur.fetchall()]
    with open(os.path.join(out, "personality.json"), "w", encoding="utf-8") as f:
        json.dump({"lines": rows}, f, ensure_ascii=False)

def export_grammar():
    cur = db.execute("""
        SELECT id, pattern, meaning, difficulty, examples_json
        FROM grammar_patterns
    """)
    rows = [{
        "id": r["id"],
        "pattern": r["pattern"],
        "meaning": r["meaning"] or "",
        "difficulty": r["difficulty"] or "N5",
        "examplesJson": r["examples_json"] or "[]"
    } for r in cur.fetchall()]
    with open(os.path.join(out, "grammar.json"), "w", encoding="utf-8") as f:
        json.dump({"patterns": rows}, f, ensure_ascii=False)

def export_stories():
    cur = db.execute("""
        SELECT id, slug, title_japanese, title_english, description, jlpt_level, genre
        FROM stories
    """)
    rows = [{
        "id": r["id"],
        "slug": r["slug"],
        "titleJp": r["title_japanese"] or "",
        "titleEn": r["title_english"] or "",
        "description": r["description"] or "",
        "jlptLevel": r["jlpt_level"] or "N5",
        "genre": r["genre"] or "daily",
        "category": r["genre"] or "daily"
    } for r in cur.fetchall()]
    with open(os.path.join(out, "stories.json"), "w", encoding="utf-8") as f:
        json.dump({"stories": rows}, f, ensure_ascii=False)

def export_lexicon():
    """Merged vocabulary + particles + verb forms for tap-to-define lookup."""
    rows = []
    cur = db.execute("""
        SELECT id, hiragana, romaji, kanji, english, category, jlpt_level,
               example_japanese, example_romaji, example_english
        FROM vocabulary
    """)
    for r in cur.fetchall():
        kanji = r["kanji"] or r["hiragana"]
        rows.append({
            "id": r["id"],
            "jp": kanji,
            "romaji": r["romaji"] or "",
            "en": r["english"] or r["dutch"] or "",
            "hiragana": r["hiragana"] or "",
            "kanji": r["kanji"],
            "category": r["category"] or "general",
            "jlptLevel": r["jlpt_level"] or "N5",
            "exampleJp": r["example_japanese"],
            "exampleRomaji": r["example_romaji"],
            "exampleEn": r["example_english"],
            "entryType": "word",
        })
    cur = db.execute("""
        SELECT id, kana, romaji, meaning, example_japanese, example_romaji, example_english
        FROM particles
    """)
    for r in cur.fetchall():
        rows.append({
            "id": 10000 + r["id"],
            "jp": r["kana"],
            "romaji": r["romaji"] or "",
            "en": r["meaning"] or "",
            "hiragana": r["kana"],
            "kanji": r["kana"],
            "category": "particle",
            "jlptLevel": "N5",
            "exampleJp": r["example_japanese"],
            "exampleRomaji": r["example_romaji"],
            "exampleEn": r["example_english"],
            "entryType": "particle",
        })
    cur = db.execute("""
        SELECT id, dictionary, romaji, meaning
        FROM verb_forms
    """)
    for r in cur.fetchall():
        rows.append({
            "id": 20000 + r["id"],
            "jp": r["dictionary"],
            "romaji": r["romaji"] or "",
            "en": r["meaning"] or "",
            "hiragana": r["dictionary"],
            "kanji": r["dictionary"],
            "category": "verb",
            "jlptLevel": "N4",
            "entryType": "verb",
        })
    with open(os.path.join(out, "lexicon.json"), "w", encoding="utf-8") as f:
        json.dump({"entries": rows}, f, ensure_ascii=False)

def export_story_beats():
    cur = db.execute("""
        SELECT id, story_id, beat_order, japanese, romaji, english, narration
        FROM story_beats
        ORDER BY story_id, beat_order
    """)
    rows = [{
        "id": r["id"],
        "storyId": r["story_id"],
        "beatOrder": r["beat_order"],
        "jp": r["japanese"] or "",
        "romaji": r["romaji"] or "",
        "en": r["english"] or "",
        "narration": r["narration"] or ""
    } for r in cur.fetchall()]
    with open(os.path.join(out, "story-beats.json"), "w", encoding="utf-8") as f:
        json.dump({"beats": rows}, f, ensure_ascii=False)

if os.path.isfile(r"${sqlitePath.replace(/\\/g, '\\\\')}"):
    export_sentences()
    export_vocab()
    export_personality()
    export_grammar()
    export_stories()
    export_story_beats()
    export_lexicon()
    print("Exported to", out)
else:
    print("SQLite not found, skipping export")
`

if (!existsSync(sqlitePath)) {
  console.warn('nozomi.sqlite not found at', sqlitePath)
  process.exit(0)
}

const result = spawnSync('python', ['-c', py], { encoding: 'utf-8' })
console.log(result.stdout)
if (result.stderr) console.error(result.stderr)
process.exit(result.status ?? 0)
