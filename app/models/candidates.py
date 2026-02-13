from sqlalchemy import Column, Integer, String, Text, Boolean
from app.models import Base
from pydantic import BaseModel

class Candidate(Base):
    __tablename__ = 'candidates'

    candidate_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)
    experience = Column(Text, nullable=True)
    years_of_experience = Column(Integer, nullable=True)
    current_role = Column(String(255), nullable=True)
    education = Column(Text, nullable=True)
    key_achievements = Column(Text, nullable=True)
    candidate_status = Column(String(50), nullable=True)
    interview_completed = Column(Boolean, default=False)