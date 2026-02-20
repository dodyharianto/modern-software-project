from sqlalchemy import Column, Float, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db.db import Base

class Role(Base):
    __tablename__ = "roles"
    id = Column(String(36), primary_key=True)
    title = Column(String(500), default="")
    status = Column(String(50), default="New")
    created_at = Column(String(50))
    updated_at = Column(String(50))
    hiring_budget = Column(Float, nullable=True)
    vacancies = Column(Integer, nullable=True)
    urgency = Column(String(100), nullable=True)
    timeline = Column(String(200), nullable=True)
    candidate_requirement_fields = Column(Text, default="[]")
    evaluation_criteria = Column(Text, default="[]")
    created_by_user_id = Column(String(255), nullable=True)

    candidates = relationship("Candidate", back_populates="role", cascade="all, delete-orphan")
    jd = relationship("JobDescription", back_populates="role", uselist=False, cascade="all, delete-orphan")
    evaluation_chat = relationship("EvaluationChat", back_populates="role", uselist=False, cascade="all, delete-orphan")