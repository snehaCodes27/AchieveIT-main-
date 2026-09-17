from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Exact Fields requested
    title = Column(String, nullable=False)            # Achievement Title
    event_name = Column(String, nullable=True)        # Event Name
    category = Column(String, nullable=False)         # Hackathon, Internship, Sports, etc.
    participant_name = Column(String, nullable=True)  # Participant Name
    organization = Column(String, nullable=True)      # College / Organization
    organizer = Column(String, nullable=True)         # Organizer / Issuing Body
    event_date = Column(String, nullable=True)        # Date
    position = Column(String, nullable=True)          # 1st, Winner, Participant
    level = Column(String, nullable=True)             # College, State, National, International
    certificate_id = Column(String, nullable=True)    # Certificate ID
    
    # Snapshot fields for historical preservation
    academic_year = Column(String, nullable=True)     # e.g. "2024-2025", "2023-2024"
    year_level = Column(String, nullable=True)        # e.g. "SE", "TE", "BE", "Graduated"
    admission_batch = Column(String, nullable=True)   # e.g. "2022-2026"

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="achievements")
    certificate = relationship("CertificateProof", back_populates="achievement", uselist=False, cascade="all, delete-orphan")