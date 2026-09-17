from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.achievement import Achievement
from app.models.certificate import CertificateProof
from app.schemas.achievement import AchievementCreate, AchievementResponse
from app.api.deps import get_current_user
from app.services.duplicate_service import check_duplicate
from app.services.name_validation_service import validate_participant_name
from app.services.storage_service import generate_signed_certificate_url

router = APIRouter()

def get_current_academic_year(date_obj: Optional[datetime] = None) -> str:
    """Returns academic year string like '2024-2025' or '2025-2026'."""
    now = date_obj or datetime.utcnow()
    # In Indian engineering colleges, academic year starts in June/July
    if now.month >= 6:
        return f"{now.year}-{now.year + 1}"
    else:
        return f"{now.year - 1}-{now.year}"

@router.post("/", response_model=AchievementResponse)
def create_achievement(
    achievement_in: AchievementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    1. Validates participant name against logged-in student name.
    2. Enforces existing duplicate detection rules (file hash, cert ID, same event).
    3. Snapshots academic year, year level, and batch for historical preservation.
    """
    # 1. Validate Certificate Owner / Participant Name
    extracted_p_name = achievement_in.participant_name or ""
    if extracted_p_name.strip():
        val = validate_participant_name(
            extracted_name=extracted_p_name,
            user_name=current_user.name,
            raw_ocr_text=achievement_in.extracted_text or ""
        )
        if not val.get("is_match", True):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Certificate Owner Mismatch: {val.get('message', 'Certificate does not belong to logged-in user.')}"
            )

    # 2. Enforce existing duplicate detection
    if achievement_in.file_hash:
        is_dup, reason, dup_info = check_duplicate(
            db=db,
            user_id=current_user.id,
            file_hash=achievement_in.file_hash,
            event_name=achievement_in.event_name,
            certificate_id=achievement_in.certificate_id
        )
        if is_dup:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate submission blocked! Reason: {reason}"
            )

    # 3. Snapshot student batch, year level & academic year at submission
    acad_year = achievement_in.academic_year or get_current_academic_year()
    yr_level = achievement_in.year_level or current_user.current_year_level or "TE"
    batch = achievement_in.admission_batch or current_user.admission_batch or "2023-2027"

    achievement = Achievement(
        user_id=current_user.id,
        title=achievement_in.title,
        event_name=achievement_in.event_name or achievement_in.title,
        category=achievement_in.category,
        participant_name=achievement_in.participant_name or current_user.name,
        organization=achievement_in.organization,
        organizer=achievement_in.organizer,
        event_date=achievement_in.event_date,
        position=achievement_in.position,
        level=achievement_in.level,
        certificate_id=achievement_in.certificate_id,
        academic_year=acad_year,
        year_level=yr_level,
        admission_batch=batch
    )
    db.add(achievement)
    db.flush()

    certificate = CertificateProof(
        achievement_id=achievement.id,
        file_url=achievement_in.file_url or "",
        file_name=achievement_in.file_name or "certificate.pdf",
        file_hash=achievement_in.file_hash,
        extracted_text=achievement_in.extracted_text
    )
    db.add(certificate)
    db.commit()
    db.refresh(achievement)

    # Attach certificate_url & file_name for response
    setattr(achievement, "certificate_url", generate_signed_certificate_url(certificate.file_url) if certificate.file_url else None)
    setattr(achievement, "file_name", certificate.file_name)

    return achievement

def format_cert_url(raw_url: Optional[str]) -> Optional[str]:
    if not raw_url or not raw_url.strip():
        return None
    return generate_signed_certificate_url(raw_url)

@router.get("/my")
def get_my_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    achievements = db.query(Achievement).filter(Achievement.user_id == current_user.id).order_by(Achievement.created_at.desc()).all()
    result = []
    for ach in achievements:
        c_url = format_cert_url(ach.certificate.file_url) if ach.certificate else None
        result.append({
            "id": ach.id,
            "user_id": ach.user_id,
            "title": ach.title,
            "event_name": ach.event_name,
            "category": ach.category,
            "participant_name": ach.participant_name,
            "organization": ach.organization,
            "organizer": ach.organizer,
            "event_date": ach.event_date,
            "position": ach.position,
            "level": ach.level,
            "certificate_id": ach.certificate_id,
            "academic_year": ach.academic_year,
            "year_level": ach.year_level,
            "admission_batch": ach.admission_batch,
            "certificate_url": c_url,
            "file_url": c_url,
            "file_name": ach.certificate.file_name if ach.certificate else None,
            "created_at": ach.created_at
        })
    return result

@router.get("/all")
def get_all_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only HOD Admin can view all department records.")
    
    achievements = db.query(Achievement).order_by(Achievement.created_at.desc()).all()
    result = []
    for ach in achievements:
        user_role = ach.owner.role.value if (ach.owner and hasattr(ach.owner.role, "value")) else str(ach.owner.role if ach.owner else "student")
        c_url = format_cert_url(ach.certificate.file_url) if ach.certificate else None
        result.append({
            "id": ach.id,
            "user_id": ach.user_id,
            "student_name": ach.owner.name if ach.owner else ach.participant_name,
            "name": ach.owner.name if ach.owner else ach.participant_name,
            "college_id": ach.owner.college_id if ach.owner else "N/A",
            "collegeId": ach.owner.college_id if ach.owner else "N/A",
            "role": user_role,
            "title": ach.title,
            "event_name": ach.event_name,
            "category": ach.category,
            "position": ach.position,
            "level": ach.level,
            "event_date": ach.event_date,
            "certificate_id": ach.certificate_id,
            "academic_year": ach.academic_year or "2024-2025",
            "year_level": ach.year_level or (ach.owner.current_year_level if ach.owner else "3rd Year"),
            "year": ach.year_level or "3rd Year",
            "admission_batch": ach.admission_batch or (ach.owner.admission_batch if ach.owner else "2023-2027"),
            "batch": ach.admission_batch or (ach.owner.admission_batch if ach.owner else "2023-2027"),
            "certificate_url": c_url,
            "file_url": c_url,
            "file_name": ach.certificate.file_name if ach.certificate else None,
            "created_at": ach.created_at
        })
    return result

@router.get("/{achievement_id}/certificate-url")
def get_achievement_certificate_url(
    achievement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Securely retrieve a signed certificate URL with strict authorization:
    - Students and Faculty can only access their own certificates
    - HOD/Admin can access any certificate in the department
    """
    achievement = db.query(Achievement).filter(Achievement.id == achievement_id).first()
    if not achievement:
        raise HTTPException(status_code=404, detail="Achievement record not found.")

    is_owner = achievement.user_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN

    if not (is_owner or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You are not authorized to view this certificate."
        )

    if not achievement.certificate or not achievement.certificate.file_url:
        raise HTTPException(status_code=404, detail="No certificate proof attached to this achievement.")

    signed_url = generate_signed_certificate_url(achievement.certificate.file_url)
    if not signed_url:
        raise HTTPException(status_code=500, detail="Failed to generate secure access URL for certificate.")

    return {
        "achievement_id": achievement.id,
        "certificate_url": signed_url,
        "file_name": achievement.certificate.file_name,
        "expires_in": 3600
    }