from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AchievementCreate(BaseModel):
    title: str
    event_name: Optional[str] = None
    category: str
    participant_name: Optional[str] = None
    organization: Optional[str] = None
    organizer: Optional[str] = None
    event_date: Optional[str] = None
    position: Optional[str] = None
    level: Optional[str] = None
    certificate_id: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_hash: Optional[str] = None
    extracted_text: Optional[str] = None
    academic_year: Optional[str] = None
    year_level: Optional[str] = None
    admission_batch: Optional[str] = None

class AchievementResponse(BaseModel):
    id: int
    user_id: int
    title: str
    event_name: Optional[str] = None
    category: str
    participant_name: Optional[str] = None
    organization: Optional[str] = None
    organizer: Optional[str] = None
    event_date: Optional[str] = None
    position: Optional[str] = None
    level: Optional[str] = None
    certificate_id: Optional[str] = None
    academic_year: Optional[str] = None
    year_level: Optional[str] = None
    admission_batch: Optional[str] = None
    certificate_url: Optional[str] = None
    file_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True