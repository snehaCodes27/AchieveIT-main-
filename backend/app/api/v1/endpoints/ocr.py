import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.ocr_service import extract_text, extract_structured_fields
from app.services.duplicate_service import compute_file_hash, check_duplicate
from app.services.name_validation_service import validate_participant_name

router = APIRouter()

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}

@router.post("/scan")
async def scan_certificate(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: JPG, PNG, PDF, WEBP"
        )

    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # 1. Compute SHA-256 Hash INSTANTLY (0.01s)
    file_hash = compute_file_hash(file_path)

    # 2. Check for exact file duplicate immediately (0.01s)
    is_dup, reason, dup_info = check_duplicate(
        db=db,
        user_id=current_user.id,
        file_hash=file_hash
    )

    # 3. If exact duplicate, return immediately without calling AI
    if is_dup:
        return {
            "file_url": f"/uploads/{unique_filename}",
            "file_name": file.filename,
            "file_hash": file_hash,
            "extracted_text": "",
            "is_duplicate": True,
            "duplicate_reason": reason,
            "duplicate_info": dup_info,
            "name_validation": {
                "is_match": True,
                "is_team": False,
                "extracted_name": current_user.name,
                "user_name": current_user.name,
                "message": "Duplicate file check flagged."
            },
            "is_name_mismatch": False,
            "data": {
                "title": dup_info.get("title", "Duplicate Certificate"),
                "event_name": dup_info.get("event_name", ""),
                "category": "Hackathon",
                "participant_name": current_user.name,
                "organization": "Department of Information Technology",
                "organizer": "",
                "event_date": dup_info.get("date", ""),
                "position": "Duplicate",
                "level": "College",
                "certificate_id": ""
            }
        }

    # 4. Fast Single-Pass AI OCR & Field Extraction (Under 1.5s)
    raw_text = extract_text(file_path)
    extracted_data = extract_structured_fields(file_path, raw_text)
    
    extracted_participant = extracted_data.get("participant_name") or ""
    
    # 5. Validate Certificate Owner / Participant Name
    name_val = validate_participant_name(
        extracted_name=extracted_participant,
        user_name=current_user.name,
        raw_ocr_text=raw_text
    )

    if not extracted_data.get("participant_name"):
        extracted_data["participant_name"] = current_user.name

    return {
        "file_url": f"/uploads/{unique_filename}",
        "file_name": file.filename,
        "file_hash": file_hash,
        "extracted_text": raw_text or str(extracted_data),
        "is_duplicate": False,
        "name_validation": name_val,
        "is_name_mismatch": not name_val["is_match"],
        "mismatch_warning": name_val.get("message") if not name_val["is_match"] else None,
        "data": extracted_data,
    }