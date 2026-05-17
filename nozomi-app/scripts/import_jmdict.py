#!/usr/bin/env python3
"""
Import JMdict (English, common words) into nozomi.sqlite vocabulary.

Data: scriptin/jmdict-simplified (CC BY-SA) — see data/jmdict/ATTRIBUTION.txt
Dictionary content: JMdict / EDRDG (see http://www.edrdg.org/jmdict/j_jmdict.html)

Usage:
  python scripts/import_jmdict.py
  python scripts/import_jmdict.py --max 5000
  python scripts/import_jmdict.py --file ../data/jmdict/jmdict-eng-common.json
  python scripts/import_jmdict.py --dry-run --max 200
"""
from __future__ import annotations

import argparse
import sqlite3
import subprocess
import sys
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
SQLITE_PATH = REPO_ROOT / "nozomi.sqlite"
JMDICT_DIR = REPO_ROOT / "data" / "jmdict"
DEFAULT_URL = (
    "https://github.com/scriptin/jmdict-simplified/releases/download/"
    "3.6.2%2B20260511143416/jmdict-eng-common-3.6.2%2B20260511143416.json.zip"
)

SKIP_POS = frozenset({"prt", "pn", "ctr", "aux"})
VERB_POS_PREFIX = ("v", "vk", "vs", "vz")


def ensure_deps() -> None:
    try:
        import ijson  # noqa: F401
        import pykakasi  # noqa: F401
    except ImportError:
        req = Path(__file__).parent / "requirements-jmdict.txt"
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-r", str(req), "-q"],
        )


def kakasi_romaji() -> callable:
    import pykakasi

    kks = pykakasi.kakasi()

    def to_romaji(text: str) -> str:
        if not text or not str(text).strip():
            return ""
        parts = kks.convert(str(text).strip())
        return " ".join(p["hepburn"] for p in parts if p.get("hepburn")).strip()

    return to_romaji


def ensure_schema(db: sqlite3.Connection) -> None:
    cols = {r[1] for r in db.execute("PRAGMA table_info(vocabulary)").fetchall()}
    if "source" not in cols:
        db.execute(
            "ALTER TABLE vocabulary ADD COLUMN source TEXT NOT NULL DEFAULT 'curated'",
        )
    if "jmdict_id" not in cols:
        db.execute("ALTER TABLE vocabulary ADD COLUMN jmdict_id TEXT")


def ensure_attribution() -> None:
    JMDICT_DIR.mkdir(parents=True, exist_ok=True)
    path = JMDICT_DIR / "ATTRIBUTION.txt"
    if path.is_file():
        return
    path.write_text(
        """JMdict data used in NOZOMI

Dictionary: JMdict (Electronic Dictionary Research and Development Group)
Converted via: scriptin/jmdict-simplified (CC BY-SA 4.0)
https://github.com/scriptin/jmdict-simplified

This import uses the English glosses, common-words subset.
See http://www.edrdg.org/jmdict/j_jmdict.html for license terms.
""",
        encoding="utf-8",
    )


def download_jmdict(url: str, dest_zip: Path) -> Path:
    if dest_zip.is_file():
        print(f"Using cached archive: {dest_zip}")
        return dest_zip
    print(f"Downloading JMdict (common, English)…\n  {url}")
    dest_zip.parent.mkdir(parents=True, exist_ok=True)
    urlretrieve(url, dest_zip)  # noqa: S310
    print(f"Saved {dest_zip.stat().st_size // 1024} KB")
    return dest_zip


def extract_json_from_zip(zip_path: Path) -> Path:
    out = JMDICT_DIR / "jmdict-eng-common.json"
    if out.is_file() and out.stat().st_mtime >= zip_path.stat().st_mtime:
        return out
    with zipfile.ZipFile(zip_path, "r") as zf:
        names = [n for n in zf.namelist() if n.endswith(".json")]
        if not names:
            raise RuntimeError(f"No JSON in {zip_path}")
        member = names[0]
        print(f"Extracting {member} -> {out}")
        out.parent.mkdir(parents=True, exist_ok=True)
        with zf.open(member) as src, open(out, "wb") as dst:
            dst.write(src.read())
    return out


def pick_kanji(word: dict) -> str | None:
    kanji = word.get("kanji") or []
    for k in kanji:
        if k.get("common"):
            return (k.get("text") or "").strip() or None
    if kanji:
        return (kanji[0].get("text") or "").strip() or None
    return None


def pick_kana(word: dict) -> str | None:
    kana = word.get("kana") or []
    for k in kana:
        if k.get("common"):
            return (k.get("text") or "").strip() or None
    if kana:
        return (kana[0].get("text") or "").strip() or None
    return None


def is_common_word(word: dict) -> bool:
    for k in word.get("kanji") or []:
        if k.get("common"):
            return True
    for k in word.get("kana") or []:
        if k.get("common"):
            return True
    return False


def pos_tags(word: dict) -> list[str]:
    tags: list[str] = []
    for sense in word.get("sense") or []:
        tags.extend(sense.get("partOfSpeech") or [])
    return tags


def should_skip(word: dict, common_only: bool) -> bool:
    if common_only and not is_common_word(word):
        return True
    tags = pos_tags(word)
    if any(t in SKIP_POS for t in tags):
        return True
    return False


def pos_to_category(tags: list[str]) -> str:
    for t in tags:
        if t in SKIP_POS:
            continue
        if t.startswith(VERB_POS_PREFIX) or t in ("vk", "vs", "vz"):
            return "verb"
        if t.startswith("adj"):
            return "emotion"
        if t in ("adv", "adv-to"):
            return "general"
        if t.startswith("n"):
            return "general"
    return "general"


def collect_english_glosses(word: dict, max_senses: int = 3) -> str:
    parts: list[str] = []
    for sense in (word.get("sense") or [])[:max_senses]:
        glosses = [
            g.get("text", "").strip()
            for g in (sense.get("gloss") or [])
            if (g.get("lang") or "").startswith("eng") and g.get("text")
        ]
        if glosses:
            parts.append("; ".join(glosses[:2]))
    joined = " · ".join(parts)
    if len(joined) > 220:
        joined = joined[:217] + "…"
    return joined


def map_word(word: dict, to_romaji) -> dict | None:
    ent_id = str(word.get("id") or "").strip()
    if not ent_id.isdigit():
        return None

    kanji = pick_kanji(word)
    kana = pick_kana(word)
    hiragana = kana or kanji
    if not hiragana:
        return None

    english = collect_english_glosses(word)
    if not english:
        return None

    tags = pos_tags(word)
    category = pos_to_category(tags)
    romaji = to_romaji(hiragana)

    return {
        "id": int(ent_id),
        "hiragana": hiragana,
        "romaji": romaji,
        "kanji": kanji if kanji and kanji != hiragana else None,
        "english": english,
        "dutch": english,
        "category": category,
        "jlpt_level": "N4",
        "example_japanese": None,
        "example_romaji": None,
        "example_english": None,
        "source": "jmdict",
        "jmdict_id": ent_id,
    }


def load_existing_keys(db: sqlite3.Connection) -> set[tuple[str, str | None]]:
    keys: set[tuple[str, str | None]] = set()
    for h, k in db.execute("SELECT hiragana, kanji FROM vocabulary"):
        keys.add((h or "", k or None))
    return keys


def iter_words(json_path: Path):
    import ijson

    with open(json_path, "rb") as f:
        for word in ijson.items(f, "words.item"):
            yield word


def import_words(
    db: sqlite3.Connection,
    json_path: Path,
    *,
    max_entries: int,
    dry_run: bool,
    to_romaji: callable,
) -> dict:
    existing_keys = load_existing_keys(db)
    stats = {
        "scanned": 0,
        "inserted": 0,
        "skipped_dup": 0,
        "skipped_filter": 0,
        "skipped_map": 0,
    }

    batch: list[dict] = []
    limit = max_entries if max_entries > 0 else None

    for word in iter_words(json_path):
        stats["scanned"] += 1
        if limit is not None and stats["inserted"] >= limit:
            break

        if should_skip(word, common_only=False):
            stats["skipped_filter"] += 1
            continue

        row = map_word(word, to_romaji)
        if not row:
            stats["skipped_map"] += 1
            continue

        key = (row["hiragana"], row["kanji"])
        if key in existing_keys:
            stats["skipped_dup"] += 1
            continue

        existing_keys.add(key)
        batch.append(row)
        stats["inserted"] += 1

        if len(batch) >= 500 and not dry_run:
            _insert_batch(db, batch)
            batch.clear()

    if batch and not dry_run:
        _insert_batch(db, batch)

    if not dry_run:
        db.commit()
    return stats


def _insert_batch(db: sqlite3.Connection, batch: list[dict]) -> None:
    db.executemany(
        """
        INSERT INTO vocabulary (
            id, hiragana, romaji, kanji, dutch, english, category, jlpt_level,
            example_japanese, example_romaji, example_english,
            source, jmdict_id
        ) VALUES (
            :id, :hiragana, :romaji, :kanji, :dutch, :english, :category, :jlpt_level,
            :example_japanese, :example_romaji, :example_english,
            :source, :jmdict_id
        )
        ON CONFLICT(id) DO UPDATE SET
            english = excluded.english,
            dutch = excluded.dutch,
            romaji = CASE WHEN excluded.romaji != '' THEN excluded.romaji ELSE vocabulary.romaji END,
            category = excluded.category,
            source = excluded.source,
            jmdict_id = excluded.jmdict_id
        """,
        batch,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Import JMdict into nozomi.sqlite")
    parser.add_argument("--file", type=Path, help="Local jmdict-simplified JSON")
    parser.add_argument("--url", default=DEFAULT_URL, help="Download URL (.zip)")
    parser.add_argument("--max", type=int, default=0, help="Max new entries (0 = all)")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-download", action="store_true")
    args = parser.parse_args()

    if not SQLITE_PATH.is_file():
        print(f"SQLite not found: {SQLITE_PATH}", file=sys.stderr)
        return 1

    ensure_deps()
    ensure_attribution()
    to_romaji = kakasi_romaji()

    if args.file:
        json_path = args.file.resolve()
    else:
        zip_path = JMDICT_DIR / "jmdict-eng-common.zip"
        if not args.no_download:
            download_jmdict(args.url, zip_path)
        elif not zip_path.is_file():
            print("Pass --file or allow download (omit --no-download)", file=sys.stderr)
            return 1
        json_path = extract_json_from_zip(zip_path)

    if not json_path.is_file():
        print(f"JSON not found: {json_path}", file=sys.stderr)
        return 1

    print(f"Importing from {json_path}")
    print(f"Target DB: {SQLITE_PATH}")
    if args.dry_run:
        print("(dry run — no writes)")

    db = sqlite3.connect(SQLITE_PATH)
    db.row_factory = sqlite3.Row
    ensure_schema(db)

    stats = import_words(
        db,
        json_path,
        max_entries=args.max,
        dry_run=args.dry_run,
        to_romaji=to_romaji,
    )
    db.close()

    print("\nImport summary:")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    print("\nNext: npm run fill-romaji && npm run export-data")
    print("  (vocabulary.json = curated only; lexicon.json includes JMdict)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
