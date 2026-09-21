import os
import shutil
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User

from app.services.ocr_service import extract_text, extract_structured_fields
from app.services.duplicate_service import compute_file_hash, check_duplicate
from app.services.name_validation_service import validate_participant_name
from app.services.storage_service import (
    upload_certificate_to_supabase,
    generate_signed_certificate_url,
)

logger = logging.getLogger(__name__)

router = APIRouter()

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}


@router.post("/scan")
async def scan_certificate(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # -----------------------------
    # 1. Validate file
    # -----------------------------
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'."
        )

    # -----------------------------
    # 2. Save uploaded file
    # -----------------------------
    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.exception("File save failed")
        raise HTTPException(
            status_code=500,
            detail="Failed to save certificate."
        )

    try:
        # -----------------------------
        # 3. Fast duplicate check
        # -----------------------------
        file_hash = compute_file_hash(file_path)

        is_dup, reason, dup_info = check_duplicate(
            db=db,
            user_id=current_user.id,
            file_hash=file_hash,
        )

        if is_dup:
            return {
                "success": False,
                "duplicate": True,
                "is_duplicate": True,
                "message": reason,
                "duplicate_info": dup_info,
            }

        # -----------------------------
        # 4. OCR (quick text for logging / preview)
        # -----------------------------
        text = extract_text(file_path)

        # Empty text from RapidOCR is acceptable for images —
        # Gemini Vision does not need it. Only block if PDF gives nothing.
        if file_ext == ".pdf" and (not text or not text.strip()):
            raise HTTPException(
                status_code=422,
                detail="Could not extract text from the PDF certificate."
            )

        # -----------------------------
        # 5. AI structured extraction (Gemini Vision primary)
        # -----------------------------
        structured_data = extract_structured_fields(
            file_path,
            raw_text=text or ""
        )

        # -----------------------------
        # 6. Name validation
        # -----------------------------
        participant_name = structured_data.get("participant_name")

        name_validation = None

        if participant_name:
            user_name = getattr(current_user, "name", "") or getattr(current_user, "full_name", "")
            name_validation = validate_participant_name(
                extracted_name=participant_name,
                user_name=user_name,
                raw_ocr_text=text or ""
            )

        # -----------------------------
        # 7. Upload to Supabase
        # -----------------------------
        storage_path = None
        signed_url = None
        try:
            storage_path = upload_certificate_to_supabase(
                user_id=current_user.id,
                file_source=file_path,
                filename=unique_filename
            )
            signed_url = generate_signed_certificate_url(storage_path)
        except Exception as upload_err:
            logger.warning(f"Supabase upload notice: {upload_err}")

        return {
            "success": True,
            "duplicate": False,
            "is_duplicate": False,
            "extracted_text": text,        # was "text" — frontend reads "extracted_text"
            "data": structured_data,
            "name_validation": name_validation,
            "file_url": signed_url,        # was "certificate_url" — frontend reads "file_url"
            "storage_path": storage_path,
            "file_hash": file_hash,
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("Certificate scanning failed")
        raise HTTPException(
            status_code=500,
            detail=f"Certificate processing failed: {str(e)}"
        )

    finally:
        # -----------------------------
        # 8. Remove temporary file
        # -----------------------------
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception:
            logger.warning("Could not remove temporary file")
