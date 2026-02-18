from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.db.db import Base

class Role(Base):
    __tablename__ = 'roles'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    status = Column(String(50), default="Open")
    hiring_budget = Column(String(100), nullable=True)
    vacancies = Column(Integer, default=1)
    urgency = Column(String(50), nullable=True)
    timeline = Column(String(100), nullable=True)
    candidate_requirement_fields = Column(JSON, nullable=True)
    evaluation_criteria = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())