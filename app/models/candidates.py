from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, JSON, DateTime
from sqlalchemy.sql import func
from app.db.db import Base
from pydantic import BaseModel

class Candidate(Base):
    __tablename__ = 'candidates'

    id = Column(Integer, primary_key=True, autoincrement=True)
    role_id = Column(Integer, ForeignKey('roles.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    skills = Column(JSON, nullable=True)
    parsed_insights = Column(JSON, nullable=True)
    checklist = Column(JSON, nullable=True)
    experience = Column(Text, nullable=True)
    column = Column(String(50), default='Outreach')
    color = Column(String(20), nullable=True)
    resume_file_path = Column(String(500), nullable=True)
    not_pushing_forward = Column(Boolean, default=False)
    sent_to_client = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())