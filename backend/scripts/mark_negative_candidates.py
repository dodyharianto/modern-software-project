"""
One-off: mark as negative (not_pushing_forward) all candidates who did not express
interest to follow up. Checks both outreach_reply and simulated_email (outreach-style
replies like "not currently looking" are sometimes stored in simulated_email).
Runs against both file storage and database so all existing data is updated.
Run from backend dir: python -m scripts.mark_negative_candidates
"""
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from services.file_storage import FileStorageService
from services.db_storage import DatabaseStorageService


def should_mark_negative(candidate: dict) -> bool:
    """True if candidate expressed no interest (outreach reply negative/neutral or simulated_email not interested)."""
    outreach_reply = candidate.get("outreach_reply")
    if isinstance(outreach_reply, dict):
        sentiment = (outreach_reply.get("sentiment") or "").lower().strip()
        if sentiment and sentiment != "positive":
            return True

    sim = candidate.get("simulated_email")
    if isinstance(sim, dict):
        consent_status = sim.get("consent_status")
        sim_type = sim.get("type", "")
        if consent_status is None and sim_type != "consent_reply":
            sentiment = (sim.get("sentiment") or "").lower().strip()
            intent = (sim.get("intent") or "").lower().strip()
            if intent == "not_interested" or (sentiment and sentiment != "positive"):
                return True

    return False

def run_storage(storage, name: str) -> int:
    roles = storage.get_all_roles()
    updated = 0
    for role in roles:
        role_id = role.get("id")
        if not role_id:
            continue
        candidates = storage.get_candidates(role_id)
        for c in candidates:
            if c.get("not_pushing_forward"):
                continue
            if not should_mark_negative(c):
                continue
            storage.update_candidate_status(role_id, c["id"], {"not_pushing_forward": True})
            updated += 1
            print(f"  [{name}] {c.get('name', c['id'])[:36]} (role: {role.get('title', role_id)[:40]})")
    return updated


def main():
    total = 0
    file_storage = FileStorageService()
    file_roles = file_storage.get_all_roles()
    if file_roles:
        print("Checking file storage (backend/data)...")
        n = run_storage(file_storage, "file")
        total += n
        print(f"  File storage: marked {n} candidate(s).")
    else:
        print("No roles in file storage, skipping.")

    # Database (SQLite)
    use_db = os.getenv("USE_DATABASE", "true").lower() != "false"
    if use_db:
        print("Checking database...")
        db_storage = DatabaseStorageService()
        db_storage.init_db()
        n = run_storage(db_storage, "db")
        total += n
        print(f"  Database: marked {n} candidate(s).")

    print(f"Done. Total marked as negative: {total} candidate(s).")


if __name__ == "__main__":
    main()
