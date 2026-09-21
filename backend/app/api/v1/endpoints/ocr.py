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
            db,
            file_hash,
            current_user.id
        )

        if is_dup:
            return {
                "success": False,
                "duplicate": True,
                "message": reason,
                "duplicate_info": dup_info,
            }

               # -----------------------------
        # 4. OCR (quick text for logging / preview)
        # -----------------------------
        text = extract_text(file_path)

        # Note: empty text from RapidOCR is acceptable for images —
        # Gemini Vision does not need it. Only block if PDF gives nothing.
        file_ext_check = os.path.splitext(file.filename)[1].lower()
        if file_ext_check == ".pdf" and (not text or not text.strip()):
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
            name_validation = validate_participant_name(
                participant_name,
                current_user.full_name
            )

        # -----------------------------
        # 7. Upload to Supabase
        # -----------------------------
        storage_path = upload_certificate_to_supabase(
            file_path,
            current_user.id,
            unique_filename
        )

        signed_url = generate_signed_certificate_url(
            storage_path
        )

        return {
            "success": True,
            "duplicate": False,
            "text": text,
            "data": structured_data,
            "name_validation": name_validation,
            "certificate_url": signed_url,
            "storage_path": storage_path,
            "file_hash": file_hash,
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("Certificate scanning failed")
        raise HTTPException(
            status_code=500,
            detail="Certificate processing failed."
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