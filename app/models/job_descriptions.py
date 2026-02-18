from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from app.db.db import Base

class JobDescription(Base):
    __tablename__ = 'job_descriptions'

    role_id = Column(Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
    job_title = Column(String(255))
    job_summary = Column(Text)
    responsibilities = Column(JSON) 
    requirements = Column(JSON)
    skills = Column(JSON)
    jd_file_path = Column(String(500))