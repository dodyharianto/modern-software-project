from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON
from app.db.db import Base

class ConsentTemplate(Base):
    __tablename__ = "consent_templates"
    
    id = Column(String(36), primary_key=True)
    name = Column(String(500), default="")
    content = Column(Text, default="")
    created_at = Column(String(50))
    updated_at = Column(String(50))