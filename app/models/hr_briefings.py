from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.sql import func
from app.db.db import Base

class HRBriefing(Base):
    __tablename__ = "hr_briefings"
    
    id = Column(String(36), primary_key=True)
    summary = Column(Text, default="")
    extracted_fields = Column(Text, default="{}")
    transcription = Column(Text, default="")
    created_at = Column(String(50))
    audio_file_path = Column(String(1000), nullable=True)