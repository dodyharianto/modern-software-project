from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.db import Base

class JobDescription(Base):
    __tablename__ = "job_descriptions"
    role_id = Column(String(36), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    job_title = Column(String(500), default="")
    job_summary = Column(Text, default="")
    responsibilities = Column(Text, default="[]")
    requirements = Column(Text, default="[]")
    skills = Column(Text, default="[]")
    jd_file_path = Column(String(1000), nullable=True)

    role = relationship("Role", back_populates="jd")