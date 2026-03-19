"""
One-off: set created_by_user_id for all existing roles to a given user ID.
User ID = the part of the user's email before the "@" sign (e.g. gftan.2023).
Run from backend dir: python -m scripts.assign_roles_creator
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from backend.db.db import get_engine
from backend.models.roles import Role as RoleModel
from sqlalchemy.orm import sessionmaker
from services.db_storage import DatabaseStorageService

# User ID = email local part (before "@"). Example: gftan.2023 for gftan.2023@mitb.smu.edu.sg
CREATOR_USER_ID = "gftan.2023"


def main():
    if not CREATOR_USER_ID.strip():
        print("Set CREATOR_USER_ID at the top of this script (email part before @), then run again.")
        return
    # Ensure roles table has created_by_user_id column
    db = DatabaseStorageService()
    db.init_db()

    engine = get_engine()
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = Session()
    try:
        updated = session.query(RoleModel).update(
            {RoleModel.created_by_user_id: CREATOR_USER_ID},
            synchronize_session=False,
        )
        session.commit()
        print(f"Updated created_by_user_id to {CREATOR_USER_ID} for {updated} role(s).")
    finally:
        session.close()


if __name__ == "__main__":
    main()
