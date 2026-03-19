from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db.db import Base

class Interview(Base):
    __tablename__ = "interviews"
    __table_args__ = (UniqueConstraint("role_id", "candidate_id", name="uq_interview_role_candidate"),)
    id = Column(Integer, primary_key=True, autoincrement=True)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    summary = Column(Text, default="")
    transcription = Column(Text, default="")
    fit_score = Column(Integer, nullable=True)
    key_points = Column(Text, default="[]")
    strengths = Column(Text, default="[]")
    concerns = Column(Text, default="[]")
    recommendation = Column(String(50), nullable=True)
    candidate_responses = Column(Text, default="{}")
    interview_completed = Column(Boolean, default=True)
    created_at = Column(String(50))
    updated_at = Column(String(50))
    audio_file_path = Column(String(1000), nullable=True)

    candidate = relationship("Candidate", back_populates="interview")