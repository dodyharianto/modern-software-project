from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db.db import Base

class EvaluationChat(Base):
    __tablename__ = "evaluation_chats"
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    messages = Column(Text, default="[]")
    updated_at = Column(String(50))

    role = relationship("Role", back_populates="evaluation_chat")