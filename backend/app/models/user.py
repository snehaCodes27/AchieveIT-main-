import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    college_id = Column(String, unique=True, index=True, nullable=False) # CE001, T001
    name = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.STUDENT, nullable=False)
    department = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    admission_batch = Column(String, nullable=True) # e.g. "2022-2026", "2023-2027"
    current_year_level = Column(String, nullable=True, default="TE") # "SE", "TE", "BE", "Graduated", "Faculty"
    status = Column(String, nullable=True, default="Active") # "Active", "Graduated"
    created_at = Column(DateTime, default=datetime.utcnow)

    achievements = relationship("Achievement", back_populates="owner", cascade="all, delete-orphan")