"""
Authentication: password hashing, JWT, and user lookup.
Users are stored in the same SQLite DB (users table).
Uses bcrypt directly with password truncated to 72 bytes to avoid bcrypt limit.
"""
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from backend.models.users import User as UserModel
import bcrypt
from jose import JWTError, jwt

import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from backend.db.db import get_engine
from sqlalchemy.orm import sessionmaker

SECRET_KEY = os.getenv("JWT_SECRET", "change-me-in-production-use-env")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
BCRYPT_MAX_BYTES = 72


def _to_bcrypt_bytes(password: str) -> bytes:
    """Truncate to 72 bytes so bcrypt never raises 'password cannot be longer than 72 bytes'."""
    raw = password.encode("utf-8")
    return raw[:BCRYPT_MAX_BYTES] if len(raw) > BCRYPT_MAX_BYTES else raw


def _session():
    engine = get_engine()
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return Session()


def hash_password(password: str) -> str:
    pwd_bytes = _to_bcrypt_bytes(password)
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    pwd_bytes = _to_bcrypt_bytes(plain)
    return bcrypt.checkpw(pwd_bytes, hashed.encode("ascii"))


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    session = _session()
    try:
        u = session.query(UserModel).filter(UserModel.email == email.strip().lower()).first()
        if not u:
            return None
        return {"id": u.id, "email": u.email, "role": u.role, "created_at": u.created_at}
    finally:
        session.close()


def get_user_by_user_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Find user by 'user id' = part of email before @ (e.g. gftan.2023)."""
    if not user_id or "@" in user_id:
        return None
    key = user_id.strip().lower()
    session = _session()
    try:
        users = session.query(UserModel).all()
        for u in users:
            if u.email and (u.email.split("@")[0] or "").lower() == key:
                return {"id": u.id, "email": u.email, "role": u.role, "created_at": u.created_at}
        return None
    finally:
        session.close()


def resolve_email_or_user_id(input_str: str) -> Optional[str]:
    """Resolve login input to an email. Input can be full email or user id (part before @)."""
    if not input_str or not input_str.strip():
        return None
    s = input_str.strip().lower()
    if "@" in s:
        return s
    user = get_user_by_user_id(s)
    return user["email"] if user else None


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    session = _session()
    try:
        u = session.query(UserModel).filter(UserModel.id == user_id).first()
        if not u:
            return None
        return {"id": u.id, "email": u.email, "role": u.role, "created_at": u.created_at}
    finally:
        session.close()


def verify_user_password(email: str, password: str) -> Optional[Dict[str, Any]]:
    session = _session()
    try:
        u = session.query(UserModel).filter(UserModel.email == email.strip().lower()).first()
        if not u or not verify_password(password, u.password_hash):
            return None
        return {"id": u.id, "email": u.email, "role": u.role, "created_at": u.created_at}
    finally:
        session.close()


def create_user(email: str, password: str, role: str = "user") -> Optional[str]:
    """Create a user. Returns user_id or None if email exists."""
    session = _session()
    try:
        email = email.strip().lower()
        if session.query(UserModel).filter(UserModel.email == email).first():
            return None
        user_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        u = UserModel(
            id=user_id,
            email=email,
            password_hash=hash_password(password),
            role=role if role in ("user", "admin") else "user",
            created_at=now,
        )
        session.add(u)
        session.commit()
        return user_id
    finally:
        session.close()


def count_users() -> int:
    session = _session()
    try:
        return session.query(UserModel).count()
    finally:
        session.close()


def list_users() -> List[Dict[str, Any]]:
    session = _session()
    try:
        users = session.query(UserModel).order_by(UserModel.created_at.desc()).all()
        return [{"id": u.id, "email": u.email, "role": u.role, "created_at": u.created_at} for u in users]
    finally:
        session.close()


def update_user_email(user_id: str, new_email: str) -> Optional[Dict[str, Any]]:
    """Update a user's email. Returns updated user dict or None if user not found or email already taken."""
    session = _session()
    try:
        new_email = new_email.strip().lower()
        if session.query(UserModel).filter(UserModel.email == new_email).filter(UserModel.id != user_id).first():
            return None  # another user has this email
        u = session.query(UserModel).filter(UserModel.id == user_id).first()
        if not u:
            return None
        u.email = new_email
        session.commit()
        session.refresh(u)
        return {"id": u.id, "email": u.email, "role": u.role, "created_at": u.created_at}
    finally:
        session.close()
