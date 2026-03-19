"""
Migrate existing file-based data into the SQLite database.
Run from backend dir: python -m scripts.migrate_to_db
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from services.file_storage import FileStorageService
from services.db_storage import DatabaseStorageService


def migrate():
    file_storage = FileStorageService()
    db_storage = DatabaseStorageService()
    db_storage.init_db()

    import json
    from sqlalchemy.orm import sessionmaker
    from backend.db.db import get_engine
    from backend.models.roles import Role as RoleModel

    # 1. Roles (insert with existing ids)
    roles = file_storage.get_all_roles()
    if not roles:
        print("No roles found in file storage. Nothing to migrate.")
        return
    engine = get_engine()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    try:
        for role in roles:
            role_id = role.get("id")
            if not role_id:
                continue
            if session.query(RoleModel).filter(RoleModel.id == role_id).first():
                print(f"Role {role_id} already in DB, skip.")
                continue
            r = RoleModel(
                id=role_id,
                title=role.get("title", ""),
                status=role.get("status", "New"),
                created_at=role.get("created_at", ""),
                updated_at=role.get("updated_at", ""),
                hiring_budget=role.get("hiring_budget"),
                vacancies=role.get("vacancies"),
                urgency=role.get("urgency"),
                timeline=role.get("timeline"),
                candidate_requirement_fields=json.dumps(role.get("candidate_requirement_fields", [])),
                evaluation_criteria=json.dumps(role.get("evaluation_criteria", [])),
                created_by_user_id=role.get("created_by_user_id"),
            )
            session.add(r)
            print(f"Migrated role: {role.get('title')} ({role_id})")
        session.commit()
    finally:
        session.close()

    # 2. Job descriptions
    for role in roles:
        role_id = role.get("id")
        jd = file_storage.get_parsed_jd(role_id)
        if jd:
            db_storage.save_parsed_jd(role_id, jd)
            print(f"Migrated JD for role {role_id}")

    # 3. Candidates (insert with existing ids)
    from backend.models.candidates import Candidate as CandidateModel
    for role in roles:
        role_id = role.get("id")
        candidates = file_storage.get_candidates(role_id)
        for c in candidates:
            cid = c.get("id")
            if not cid:
                continue
            if db_storage.get_candidate(role_id, cid):
                continue
            sess = SessionLocal()
            try:
                cand = CandidateModel(
                    id=cid,
                    role_id=role_id,
                    name=c.get("name", ""),
                    summary=c.get("summary", ""),
                    skills=json.dumps(c.get("skills", [])),
                    experience=c.get("experience", "") or "",
                    parsed_insights=json.dumps(c.get("parsed_insights", {})),
                    column=c.get("column", "outreach"),
                    color=c.get("color", "amber-transparent"),
                    created_at=c.get("created_at", ""),
                    updated_at=c.get("updated_at", ""),
                    outreach_sent=c.get("outreach_sent", False),
                    outreach_message=c.get("outreach_message"),
                    checklist=json.dumps(c.get("checklist", {})),
                    consent_form_sent=c.get("consent_form_sent", False),
                    consent_form_received=c.get("consent_form_received", False),
                    email_status=c.get("email_status"),
                    not_pushing_forward=c.get("not_pushing_forward", False),
                    sent_to_client=c.get("sent_to_client", False),
                    consent_email=json.dumps(c["consent_email"]) if c.get("consent_email") else None,
                    consent_reply=json.dumps(c["consent_reply"]) if c.get("consent_reply") else None,
                    simulated_email=json.dumps(c["simulated_email"]) if c.get("simulated_email") else None,
                    outreach_reply=json.dumps(c["outreach_reply"]) if c.get("outreach_reply") else None,
                )
                sess.add(cand)
                sess.commit()
                print(f"Migrated candidate: {c.get('name')} ({cid})")
            except Exception as e:
                sess.rollback()
                print(f"Skip candidate {cid}: {e}")
            finally:
                sess.close()

    # 4. Interviews
    for role in roles:
        role_id = role.get("id")
        candidates = file_storage.get_candidates(role_id)
        for c in candidates:
            cid = c.get("id")
            inv = file_storage.get_interview_data(role_id, cid)
            if inv:
                db_storage.save_interview_data(role_id, cid, inv)
                print(f"Migrated interview for candidate {cid}")

    # 5. Evaluation chats
    for role in roles:
        role_id = role.get("id")
        messages = file_storage.get_evaluation_chat(role_id)
        if messages:
            db_storage.save_evaluation_chat(role_id, messages)
            print(f"Migrated evaluation chat for role {role_id}")

    # 6. HR Briefings
    briefings = file_storage.get_all_hr_briefings()
    from backend.models.hr_briefings import HRBriefing as HRBriefingModel
    from backend.models.role_hr_briefings import RoleHRBriefing
    sess = SessionLocal()
    try:
        for b in briefings:
            if sess.query(HRBriefingModel).filter(HRBriefingModel.id == b["id"]).first():
                continue
            h = HRBriefingModel(
                id=b["id"],
                summary=b.get("summary", ""),
                extracted_fields=json.dumps(b.get("extracted_fields", {})),
                transcription=b.get("transcription", ""),
                created_at=b.get("created_at", ""),
            )
            sess.add(h)
            for rid in b.get("role_ids", []):
                sess.add(RoleHRBriefing(role_id=rid, briefing_id=b["id"]))
            print(f"Migrated HR briefing {b['id']}")
        sess.commit()
    finally:
        sess.close()

    # 7. Consent templates
    templates = file_storage.get_all_consent_templates()
    for t in templates:
        db_storage.save_consent_template(t["name"], t["content"], t["id"])
        print(f"Migrated consent template: {t.get('name')}")

    print("Migration complete.")


if __name__ == "__main__":
    migrate()
