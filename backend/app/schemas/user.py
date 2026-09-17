from pydantic import BaseModel
from typing import Optional
from app.models.user import UserRole

class UserLogin(BaseModel):
    college_id: str
    password: str

class UserResponse(BaseModel):
    id: int
    college_id: str
    name: str
    role: UserRole
    department: str
    email: Optional[str] = None
    admission_batch: Optional[str] = None
    current_year_level: Optional[str] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True