import csv
import io
import re
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
import openpyxl

from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.achievement import Achievement
from app.schemas.user import UserResponse
from app.core.security import get_password_hash
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/stats")
def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get live user counts and stats for HOD Admin dashboard.
    """
    total_users = db.query(User).count()
    student_count = db.query(User).filter(User.role == UserRole.STUDENT).count()
    teacher_count = db.query(User).filter(User.role == UserRole.TEACHER).count()
    total_achievements = db.query(Achievement).count()

    return {
        "total_users": total_users,
        "student_count": student_count,
        "teacher_count": teacher_count,
        "total_achievements": total_achievements
    }

@router.post("/upload-csv")
async def upload_users_file(
    file: UploadFile = File(...),
    target_role: str = Query("student"), # 'student' or 'teacher'
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bulk import students or professors directly from Excel (.xlsx, .xls) OR CSV (.csv) files.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only HOD Admin can upload user files.")

    filename = file.filename.lower()
    content = await file.read()
    rows = []

    # 1. Parse Excel Files (.xlsx, .xls)
    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        try:
            wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
            sheet = wb.active
            data = list(sheet.iter_rows(values_only=True))
            if not data or len(data) < 2:
                raise HTTPException(status_code=400, detail="Excel file is empty or has no data rows.")
            
            headers = [str(cell).strip() if cell is not None else "" for cell in data[0]]
            for r in data[1:]:
                if any(r):
                    row_dict = {headers[i]: str(r[i]).strip() if i < len(r) and r[i] is not None else "" for i in range(len(headers))}
                    rows.append(row_dict)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read Excel file: {str(e)}")

    # 2. Parse CSV / TSV Files (.csv, .txt)
    else:
        text = content.decode("utf-8-sig", errors="ignore")
        first_line = text.split('\n')[0] if text else ""
        delimiter = '\t' if '\t' in first_line else ','
        csv_reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
        for r in csv_reader:
            rows.append(r)

    imported_count = 0
    assigned_role = UserRole.TEACHER if target_role.lower() in ["teacher", "professor", "faculty"] else UserRole.STUDENT

    for row in rows:
        # Create normalized dictionary with all non-alphanumeric characters removed
        norm_row = {re.sub(r'[^a-z0-9]', '', str(k).lower()): str(v or "").strip() for k, v in row.items() if k}
        
        college_id = (
            norm_row.get("facultyid") or 
            norm_row.get("empid") or 
            norm_row.get("employeeid") or 
            norm_row.get("profid") or 
            norm_row.get("teacherid") or 
            norm_row.get("studentid") or 
            norm_row.get("collegeid") or 
            norm_row.get("grnumber") or 
            norm_row.get("rollno") or 
            norm_row.get("id") or ""
        )
        
        name = (
            norm_row.get("nameoffaculty") or 
            norm_row.get("facultyname") or 
            norm_row.get("professorname") or 
            norm_row.get("teachername") or 
            norm_row.get("nameofstudent") or 
            norm_row.get("studentname") or 
            norm_row.get("fullname") or 
            norm_row.get("name") or ""
        )
        
        email = (
            norm_row.get("newmailcreated") or 
            norm_row.get("email") or 
            norm_row.get("emailid") or 
            norm_row.get("mail") or ""
        )

        batch = (
            norm_row.get("admissionbatch") or
            norm_row.get("batch") or
            norm_row.get("cohort") or ""
        )
        if not batch and college_id:
            cid_up = college_id.strip().upper()
            if "DSIT" in cid_up or "DSE" in cid_up or "DS" in cid_up:
                # Direct Second Year: Admitted 2024 -> joins 2022-2026 graduating batch (BE / Final Year)
                if cid_up.startswith("2024"):
                    batch = "2022-2026"
                    inferred_year = "BE"
                elif cid_up.startswith("2025"):
                    batch = "2023-2027"
                    inferred_year = "TE"
                elif cid_up.startswith("2023"):
                    batch = "2021-2025"
                    inferred_year = "Graduated"
                else:
                    batch = "2022-2026"
                    inferred_year = "BE"
            elif cid_up.startswith("2022"):
                batch = "2022-2026"
                inferred_year = "BE"
            elif cid_up.startswith("2023"):
                batch = "2023-2027"
                inferred_year = "TE"
            elif cid_up.startswith("2024"):
                batch = "2024-2028"
                inferred_year = "SE"
            elif cid_up.startswith("2021"):
                batch = "2021-2025"
                inferred_year = "Graduated"
            else:
                batch = "2022-2026"
                inferred_year = "BE"

        year_level = (
            norm_row.get("currentyear") or
            norm_row.get("yearlevel") or
            norm_row.get("year") or
            norm_row.get("class") or ""
        )
        if not year_level:
            year_level = "Faculty" if assigned_role == UserRole.TEACHER else (inferred_year or "TE")

        user_status = norm_row.get("status") or "Active"

        if not college_id or not name:
            continue

        existing = db.query(User).filter(User.college_id == college_id).first()
        initial_password = "Welcome@123" if assigned_role == UserRole.TEACHER else college_id
        if not existing:
            user = User(
                college_id=college_id,
                name=name,
                email=email if email else f"{college_id.lower()}@college.edu",
                role=assigned_role,
                department="Information Technology",
                hashed_password=get_password_hash(initial_password),
                admission_batch=batch if assigned_role == UserRole.STUDENT else None,
                current_year_level=year_level,
                status=user_status
            )
            db.add(user)
            imported_count += 1
        else:
            # Update existing user metadata if empty
            if not existing.admission_batch and assigned_role == UserRole.STUDENT:
                existing.admission_batch = batch
            if not existing.current_year_level:
                existing.current_year_level = year_level
            if not existing.status:
                existing.status = user_status

    db.commit()
    role_name = "Professors" if assigned_role == UserRole.TEACHER else "Students"
    return {"message": f"Successfully imported {imported_count} new {role_name}!", "imported_count": imported_count}

from pydantic import BaseModel

class FacultyCreateRequest(BaseModel):
    college_id: str
    name: str
    email: Optional[str] = None
    department: Optional[str] = "Information Technology"
    password: Optional[str] = "Welcome@123"

class UserStatusUpdateRequest(BaseModel):
    status: str

@router.get("/faculty")
def get_all_faculty(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all faculty members with status and achievement statistics for HOD Admin.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only HOD Admin can view faculty management list.")

    faculty_members = db.query(User).filter(User.role == UserRole.TEACHER).order_by(User.id.desc()).all()
    
    result = []
    for f in faculty_members:
        ach_count = db.query(Achievement).filter(Achievement.user_id == f.id).count()
        result.append({
            "id": f.id,
            "college_id": f.college_id,
            "name": f.name,
            "email": f.email or f"{f.college_id.lower()}@college.edu",
            "department": f.department,
            "role": f.role.value if hasattr(f.role, "value") else str(f.role),
            "status": f.status or "Active",
            "current_year_level": f.current_year_level or "Faculty",
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "achievements_count": ach_count,
        })
    return result

@router.post("/faculty")
def create_faculty_member(
    data: FacultyCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    HOD Admin creates a new faculty member.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only HOD Admin can add faculty members.")

    cid = data.college_id.strip()
    existing = db.query(User).filter(User.college_id == cid).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Faculty ID '{cid}' already exists.")

    raw_email = (data.email or "").strip()
    if not raw_email or "@" not in raw_email:
        clean_name = data.name.lower().replace("prof.", "").replace("dr.", "").replace("mr.", "").replace("mrs.", "").replace("ms.", "").strip().replace(" ", ".")
        raw_email = f"{clean_name}@clg.ac.in"

    initial_password = data.password or "Welcome@123"
    new_faculty = User(
        college_id=cid,
        name=data.name.strip(),
        email=raw_email,
        role=UserRole.TEACHER,
        department=data.department or "Information Technology",
        hashed_password=get_password_hash(initial_password),
        current_year_level="Faculty",
        admission_batch="Faculty",
        status="Active"
    )
    db.add(new_faculty)
    db.commit()
    db.refresh(new_faculty)

    return {
        "message": f"Faculty {new_faculty.name} ({new_faculty.college_id}) created successfully!",
        "faculty": {
            "id": new_faculty.id,
            "college_id": new_faculty.college_id,
            "name": new_faculty.name,
            "email": new_faculty.email,
            "status": new_faculty.status,
        }
    }

@router.patch("/{user_id}/status")
def update_user_status(
    user_id: int,
    data: UserStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Toggle or update user status (Active vs Inactive) by HOD Admin.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only HOD Admin can update user status.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    new_status = data.status.strip().capitalize()
    if new_status not in ["Active", "Inactive", "Relieved", "Graduated"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be 'Active' or 'Inactive'.")

    user.status = new_status
    db.commit()
    return {"message": f"User {user.name} ({user.college_id}) status updated to {new_status}!", "status": new_status}

@router.delete("/faculty/{user_id}")
def delete_faculty_member(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    HOD Admin deletes a faculty member or sets them to Inactive.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only HOD Admin can delete faculty members.")

    faculty = db.query(User).filter(User.id == user_id, User.role == UserRole.TEACHER).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty member not found.")

    # Check if achievements exist
    ach_count = db.query(Achievement).filter(Achievement.user_id == user_id).count()
    if ach_count > 0:
        faculty.status = "Inactive"
        db.commit()
        return {
            "message": f"Faculty has {ach_count} recorded achievements. Their account has been marked Inactive (Relieved) to preserve department archives.",
            "status": "Inactive"
        }

    db.delete(faculty)
    db.commit()
    return {"message": f"Faculty member {faculty.name} deleted successfully!"}

@router.get("/", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only HOD Admin can view user list.")
    return db.query(User).all()