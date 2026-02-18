from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.sql import func
from app.db.db import Base

class Interview(Base):
    __tablename__ = 'interviews'

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey('roles.id', ondelete='CASCADE'), nullable=False)
    candidate_id = Column(Integer, ForeignKey('candidates.id', ondelete='CASCADE'), nullable=False)
    summary = Column(Text, nullable=True)
    transcription = Column(Text, nullable=True)
    fit_score = Column(Integer, nullable=True)
    key_points = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)
    concerns = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    candidate_responses = Column(JSON, nullable=True)
    interview_completed = Column(String(50), default="False")
    audio_file_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    __table_args__ = (UniqueConstraint('role_id', 'candidate_id', name='_role_candidate_uc'),)