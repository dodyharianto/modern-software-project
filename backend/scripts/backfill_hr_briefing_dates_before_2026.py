"""
One-off: set hr_briefings.created_at to 2026-03-16 12:00:00 for rows/files dated before 2026.

Updates:
  - SQL table hr_briefings (when DATABASE_URL points at your DB)
  - File storage: backend/data/hr_briefings/<id>/briefing.json (when those dirs exist)

Run from project root:
  python backend/scripts/backfill_hr_briefing_dates_before_2026.py

Dry run (no writes):
  python backend/scripts/backfill_hr_briefing_dates_before_2026.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Project root (…/modern-software-project)
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

TARGET_CREATED_AT = "2026-03-16T12:00:00"
# Strictly before start of calendar year 2026
CUTOFF_ISO = "2026-01-01T00:00:00"


def _is_older_than_2026(created_at: str | None) -> bool:
    if created_at is None:
        return False
    s = str(created_at).strip()
    if not s:
        return False
    if s < CUTOFF_ISO[:10]:  # YYYY-MM-DD lex compare
        return True
    if s < CUTOFF_ISO:
        return True
    if len(s) >= 4 and s[:4].isdigit():
        try:
            return int(s[:4]) < 2026
        except ValueError:
            pass
    return False


def _data_hr_briefings_dir() -> Path:
    backend_dir = ROOT / "backend"
    data = backend_dir / "data"
    if data.exists():
        return data / "hr_briefings"
    return Path("data") / "hr_briefings"


def patch_file_storage(dry_run: bool) -> int:
    briefings_root = _data_hr_briefings_dir()
    if not briefings_root.is_dir():
        print(f"No file briefing dir at {briefings_root} (skip).")
        return 0
    n = 0
    for briefing_dir in briefings_root.iterdir():
        if not briefing_dir.is_dir():
            continue
        path = briefing_dir / "briefing.json"
        if not path.is_file():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as e:
            print(f"Skip {path}: {e}")
            continue
        ca = data.get("created_at")
        if not _is_older_than_2026(ca):
            continue
        print(f"File {path.name} in {briefing_dir.name}: {ca!r} -> {TARGET_CREATED_AT}")
        n += 1
        if not dry_run:
            data["created_at"] = TARGET_CREATED_AT
            path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return n


def patch_database(dry_run: bool) -> int:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env", override=True)
    from sqlalchemy import text

    from backend.db.db import get_engine

    engine = get_engine()
    # Match rows strictly before 2026 (ISO strings sort lexicographically)
    sql_select = text(
        "SELECT id, created_at FROM hr_briefings WHERE created_at IS NOT NULL AND created_at < :cutoff"
    )
    sql_update = text(
        "UPDATE hr_briefings SET created_at = :target WHERE created_at IS NOT NULL AND created_at < :cutoff"
    )
    cutoff = CUTOFF_ISO
    with engine.connect() as conn:
        rows = conn.execute(sql_select, {"cutoff": cutoff}).fetchall()
    for row in rows:
        print(f"DB {row[0]}: {row[1]!r} -> {TARGET_CREATED_AT}")
    if dry_run or not rows:
        return len(rows)
    with engine.begin() as conn:
        result = conn.execute(
            sql_update, {"target": TARGET_CREATED_AT, "cutoff": cutoff}
        )
        return result.rowcount or len(rows)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Print changes only; do not write DB or files",
    )
    args = p.parse_args()
    print(f"Target created_at: {TARGET_CREATED_AT} (briefings with created_at < {CUTOFF_ISO})")
    if args.dry_run:
        print("Dry run — no writes.\n")
    db_n = patch_database(args.dry_run)
    file_n = patch_file_storage(args.dry_run)
    print(f"\nDone. DB rows affected: {db_n}; file briefings updated: {file_n}.")


if __name__ == "__main__":
    main()
