from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.sql import func
from app.db.db import Base

class EvaluationChat(Base):
    __tablename__ = 'evaluation_chats'

    role_id = Column(Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
    messages = Column(JSON)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())