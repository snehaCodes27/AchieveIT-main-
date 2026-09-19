import re
from datetime import datetime
from typing import Optional, Tuple

def get_current_academic_year(date_obj: Optional[datetime] = None) -> str:
    """
    Returns current academic year string like '2026-2027'.
    Academic year in Indian engineering colleges starts in June/July.
    """
    now = date_obj or datetime.utcnow()
    if now.month >= 6:
        start_yr = now.year
    else:
        start_yr = now.year - 1
    return f"{start_yr}-{start_yr + 1}"

def get_year_level_from_batch(batch: Optional[str], academic_year: Optional[str] = None) -> str:
    """
    Calculates current year level (FE, SE, TE, BE, Graduated) based on graduation batch and academic year.
    For current academic year 2026-2027 (start year 2026):
      - Graduating 2027 (batch 2023-2027) -> BE / Final Year (diff = 1)
      - Graduating 2028 (batch 2024-2028) -> TE (diff = 2)
      - Graduating 2029 (batch 2025-2029) -> SE (diff = 3)
      - Graduating 2030 (batch 2026-2030) -> FE (diff = 4)
      - Graduating <= 2026 (batch 2022-2026 or earlier) -> Graduated (diff <= 0)
    """
    if not batch or str(batch).strip().lower() in ["faculty", "teacher", "none", ""]:
        return "Faculty"

    ay = academic_year or get_current_academic_year()
    try:
        current_ay_start = int(ay.split("-")[0].strip())
    except Exception:
        current_ay_start = 2026

    # Extract graduation year from batch (e.g., '2023-2027' -> 2027)
    grad_year = None
    years = re.findall(r"\d{4}", str(batch))
    if len(years) >= 2:
        grad_year = int(years[1])
    elif len(years) == 1:
        grad_year = int(years[0])

    if not grad_year:
        return "BE"

    diff = grad_year - current_ay_start
    if diff == 1:
        return "BE"
    elif diff == 2:
        return "TE"
    elif diff == 3:
        return "SE"
    elif diff == 4:
        return "FE"
    elif diff <= 0:
        return "Graduated"
    else:
        return "FE"

def get_batch_from_college_id(college_id: Optional[str]) -> str:
    """
    Infers graduating batch from college ID:
    - Direct Second Year (DS / DSE / DSIT): 3-year course
        e.g. 2024DSIT... -> joined SE 2024 -> graduates 2027 -> '2023-2027'
        e.g. 2025DSIT... -> joined SE 2025 -> graduates 2028 -> '2024-2028'
        e.g. 2026DSIT... -> joined SE 2026 -> graduates 2029 -> '2025-2029'
    - Regular FE admissions (FH / regular): 4-year course
        e.g. 2023FHIT... -> joined FE 2023 -> graduates 2027 -> '2023-2027'
        e.g. 2024FHIT... -> joined FE 2024 -> graduates 2028 -> '2024-2028'
        e.g. 2025FHIT... -> joined FE 2025 -> graduates 2029 -> '2025-2029'
        e.g. 2026FHIT... -> joined FE 2026 -> graduates 2030 -> '2026-2030'
        e.g. 2022FHIT... -> joined FE 2022 -> graduates 2026 -> '2022-2026'
    """
    cid = (college_id or "").strip().upper()
    m = re.search(r"(\d{4})", cid)
    if not m:
        return "2023-2027"

    join_year = int(m.group(1))
    is_dse = any(k in cid for k in ["DS", "DSE", "DSIT"])

    if is_dse:
        grad_year = join_year + 3
        batch_start = grad_year - 4
    else:
        grad_year = join_year + 4
        batch_start = join_year

    return f"{batch_start}-{grad_year}"

def calculate_student_academic_info(
    college_id: Optional[str],
    batch: Optional[str] = None,
    academic_year: Optional[str] = None
) -> Tuple[str, str, str]:
    """
    Returns (academic_year, batch, year_level).
    """
    ay = academic_year or get_current_academic_year()
    effective_batch = batch or get_batch_from_college_id(college_id)
    year_level = get_year_level_from_batch(effective_batch, ay)
    return ay, effective_batch, year_level
