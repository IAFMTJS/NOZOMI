/**
 * Fill missing romaji in nozomi.sqlite (if present) and public/data/*.json
 * using pykakasi (pip install pykakasi).
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const sqlitePath = path.resolve(root, '..', 'nozomi.sqlite')
const dataDir = path.join(root, 'public', 'data')

const py = `
import json, os, sqlite3, subprocess, sys

try:
    import pykakasi
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pykakasi", "-q"])
    import pykakasi

kks = pykakasi.kakasi()

def to_romaji(text):
    if not text or not str(text).strip():
        return ""
    parts = kks.convert(str(text).strip())
    return " ".join(p["hepburn"] for p in parts if p.get("hepburn")).strip()

PERSONALITY_JP_FIX = {
    254: "この文法は知っています。もう一度。",
    255: "いい感じ！もっと自然に聞こえたね。",
}

def needs_romaji(jp, romaji):
    if not jp or not str(jp).strip():
        return False
    r = (romaji or "").strip()
    if not r:
        return True
    # Re-generate compressed machine romaji (old API had no word spaces)
    if len(str(jp)) > 4 and " " not in r and len(r) > 10:
        return True
    return False

def fill_row(row, jp_key="jp", romaji_key="romaji", ex_jp="exampleJp", ex_romaji="exampleRomaji"):
    rid = row.get("id")
    if rid in PERSONALITY_JP_FIX and not (row.get(jp_key) or "").strip():
        row[jp_key] = PERSONALITY_JP_FIX[rid]
    jp = row.get(jp_key) or ""
    if needs_romaji(jp, row.get(romaji_key)):
        row[romaji_key] = to_romaji(jp)
    ex = row.get(ex_jp) or ""
    if needs_romaji(ex, row.get(ex_romaji)):
        row[ex_romaji] = to_romaji(ex)
    return row

def fill_json_file(path, array_key):
    if not os.path.isfile(path):
        return 0
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    rows = data.get(array_key, [])
    filled = 0
    for row in rows:
        before = (row.get("romaji") or "").strip()
        fill_row(row)
        after = (row.get("romaji") or "").strip()
        if after and after != before:
            filled += 1
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    return filled

def fill_sqlite(db_path):
    if not os.path.isfile(db_path):
        return {}
    db = sqlite3.connect(db_path)
    counts = {}

    def update_table(table, jp_col, romaji_col, where_extra=""):
        cur = db.execute(
            f"SELECT id, {jp_col}, {romaji_col} FROM {table} WHERE {jp_col} IS NOT NULL AND TRIM({jp_col}) != '' {where_extra}"
        )
        n = 0
        for rid, jp, romaji in cur.fetchall():
            if not needs_romaji(jp, romaji):
                continue
            new_r = to_romaji(jp)
            if new_r:
                db.execute(f"UPDATE {table} SET {romaji_col} = ? WHERE id = ?", (new_r, rid))
                n += 1
        counts[table] = n

    update_table("sentences", "japanese", "romaji")
    update_table("vocabulary", "hiragana", "romaji")
    # vocab: also try kanji column when hiragana empty
    cur = db.execute(
        "SELECT id, kanji, romaji FROM vocabulary WHERE (romaji IS NULL OR TRIM(romaji) = '') AND kanji IS NOT NULL AND TRIM(kanji) != ''"
    )
    for rid, jp, _ in cur.fetchall():
        romaji = to_romaji(jp)
        if romaji:
            db.execute("UPDATE vocabulary SET romaji = ? WHERE id = ?", (romaji, rid))
            counts["vocabulary_kanji"] = counts.get("vocabulary_kanji", 0) + 1

    update_table("personality_lines", "japanese", "romaji")
    update_table("story_beats", "japanese", "romaji")

    cur = db.execute(
        "SELECT id, example_japanese, example_romaji FROM vocabulary WHERE example_japanese IS NOT NULL AND TRIM(example_japanese) != '' AND (example_romaji IS NULL OR TRIM(example_romaji) = '')"
    )
    ex_n = 0
    for rid, jp, _ in cur.fetchall():
        romaji = to_romaji(jp)
        if romaji:
            db.execute("UPDATE vocabulary SET example_romaji = ? WHERE id = ?", (romaji, rid))
            ex_n += 1
    counts["vocabulary_examples"] = ex_n

    db.commit()
    db.close()
    return counts

out_dir = r"${dataDir.replace(/\\/g, '\\\\')}"
sqlite = r"${sqlitePath.replace(/\\/g, '\\\\')}"

total = 0
for fname, key in [
    ("sentences.json", "sentences"),
    ("vocabulary.json", "vocabulary"),
    ("personality.json", "lines"),
    ("story-beats.json", "beats"),
]:
    p = os.path.join(out_dir, fname)
    n = fill_json_file(p, key)
    print(f"JSON {fname}: filled {n} romaji fields")
    total += n

if os.path.isfile(sqlite):
    counts = fill_sqlite(sqlite)
    print("SQLite updates:", counts)
else:
    print("SQLite not found, skipped DB update")

print("Done. Total JSON fields filled:", total)
`

const result = spawnSync('python', ['-c', py], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 })
if (result.stdout) console.log(result.stdout)
if (result.stderr) console.error(result.stderr)
process.exit(result.status ?? 1)
