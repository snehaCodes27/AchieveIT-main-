import hashlib
from typing import Tuple, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.achievement import Achievement
from app.models.certificate import CertificateProof

def compute_file_hash(file_path: str) -> str:
    """Computes SHA-256 cryptographic hash of a file."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()

def check_duplicate(
    db: Session,
    user_id: int,
    file_hash: str,
    event_name: Optional[str] = None,
    title: Optional[str] = None,
    certificate_id: Optional[str] = None
) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Checks if certificate or achievement was already submitted.
    """
    # 1. Check for identical file hash in database
    if file_hash:
        existing_cert = db.query(CertificateProof).filter(
            CertificateProof.file_hash == file_hash
        ).first()
        if existing_cert:
            ach = existing_cert.achievement
            return True, "EXACT_FILE_EXISTS", {
                "title": ach.title if ach else "Certificate",
                "event_name": ach.event_name if ach else "",
                "submitted_by": ach.owner.name if ach and ach.owner else "Another Student",
                "date": ach.created_at.strftime("%d-%m-%Y") if ach and ach.created_at else ""
            }

    # 2. Check by Certificate ID
    if certificate_id and certificate_id.strip():
        cert_match = db.query(Achievement).filter(
            func.lower(Achievement.certificate_id) == certificate_id.strip().lower()
        ).first()
        if cert_match:
            return True, "CERTIFICATE_ID_EXISTS", {
                "title": cert_match.title,
                "event_name": cert_match.event_name,
                "submitted_by": cert_match.owner.name if cert_match.owner else "Student",
                "date": cert_match.created_at.strftime("%d-%m-%Y") if cert_match.created_at else ""
            }

    # 3. Check by Event Name or Title for this student
    search_term = (event_name or title or "").strip().lower()
    if search_term and len(search_term) >= 3:
        for ach in db.query(Achievement).filter(Achievement.user_id == user_id).all():
            existing_event = (ach.event_name or "").lower()
            existing_title = (ach.title or "").lower()
            if search_term in existing_event or search_term in existing_title or existing_event in search_term:
                return True, "SAME_EVENT_SUBMITTED", {
                    "title": ach.title,
                    "event_name": ach.event_name,
                    "submitted_by": "You",
                    "date": ach.created_at.strftime("%d-%m-%Y") if ach.created_at else ""
                }

    return False, None, None