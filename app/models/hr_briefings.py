from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.sql import func
from app.db.db import Base

class HRBriefing(Base):
    __tablename__ = 'hr_briefings'

    id = Column(Integer, primary_key=True, index=True)
    summary = Column(Text)
    extracted_fields = Column(JSON)
    transcription = Column(Text)
    audio_file_path = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())