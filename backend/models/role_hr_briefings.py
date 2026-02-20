from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.sql import func
from backend.db.db import Base

class RoleHRBriefing(Base):
    __tablename__ = "role_hr_briefings"
    
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    briefing_id = Column(String(36), ForeignKey("hr_briefings.id", ondelete="CASCADE"), primary_key=True)