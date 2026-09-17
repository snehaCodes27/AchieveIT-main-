from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class CertificateProof(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    achievement_id = Column(Integer, ForeignKey("achievements.id"), nullable=False)
    
    file_url = Column(String, nullable=False) # Supabase Storage URL
    file_name = Column(String, nullable=False)
    file_hash = Column(String, index=True, nullable=True) # For duplicate detection
    extracted_text = Column(Text, nullable=True) # Raw Tesseract OCR text
    created_at = Column(DateTime, default=datetime.utcnow)

    achievement = relationship("Achievement", back_populates="certificate")