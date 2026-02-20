from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, JSON, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.db import Base
from pydantic import BaseModel

class Candidate(Base):
    __tablename__ = "candidates"
    
    id = Column(String(36), primary_key=True)
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(500), default="")
    summary = Column(Text, default="")
    skills = Column(Text, default="[]")
    experience = Column(Text, default="")
    parsed_insights = Column(Text, default="{}")
    column = Column(String(50), default="outreach")
    color = Column(String(50), default="amber-transparent")
    created_at = Column(String(50))
    updated_at = Column(String(50))
    outreach_sent = Column(Boolean, default=False)
    outreach_message = Column(Text, nullable=True)
    checklist = Column(Text, default="{}")
    consent_form_sent = Column(Boolean, default=False)
    consent_form_received = Column(Boolean, default=False)
    email_status = Column(String(100), nullable=True)
    not_pushing_forward = Column(Boolean, default=False)
    sent_to_client = Column(Boolean, default=False)
    consent_email = Column(Text, nullable=True)
    consent_reply = Column(Text, nullable=True)
    simulated_email = Column(Text, nullable=True)
    outreach_reply = Column(Text, nullable=True)
    resume_file_path = Column(String(1000), nullable=True)

    role = relationship("Role", back_populates="candidates")
    interview = relationship("Interview", back_populates="candidate", uselist=False, cascade="all, delete-orphan")