from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import UserLogin, UserResponse
from app.schemas.token import TokenResponse
from app.core.security import verify_password, get_password_hash, create_access_token
from app.api.deps import get_current_user
from pydantic import BaseModel

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user using College ID and password, return JWT token."""
    user = db.query(User).filter(User.college_id == login_data.college_id.strip()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid College ID or Password"
        )
    
    # Check if account is active
    if user.status and user.status.strip().lower() in ["inactive", "relieved", "disabled"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is currently Inactive (Job Switch / Relieved). Please contact the HOD Admin."
        )
    
    access_token = create_access_token(
        subject=user.college_id,
        role=user.role.value
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get details of the currently logged-in user."""
    return current_user

@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change password for current logged-in student, teacher or HOD admin."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    if len(data.new_password.strip()) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long"
        )
    current_user.hashed_password = get_password_hash(data.new_password.strip())
    db.commit()
    return {"message": "Password updated successfully!"}