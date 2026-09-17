import time
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.achievement import Achievement
from app.models.user import User
from google import genai

def ask_rag_assistant(query: str, db: Session) -> str:
    records = db.query(Achievement, User).outerjoin(User, Achievement.user_id == User.id).all()

    if not records:
        return "No achievements are currently recorded in the IT Department database."

    records_context = []
    for i, (ach, user) in enumerate(records, 1):
        user_name = user.name if user else "Unknown User"
        college_id = user.college_id if user else "N/A"
        participant_name = ach.participant_name or user_name
        user_role = user.role.value if (user and hasattr(user.role, "value")) else ("teacher" if user and user.role == "teacher" else "student")
        year_lvl = ach.year_level or (user.current_year_level if user else "BE")
        batch = ach.admission_batch or (user.admission_batch if user else "2022-2026")
        acad_yr = ach.academic_year or "2024-2025"
        
        record_str = (
            f"Record #{i}:\n"
            f"- Name: {user_name}\n"
            f"- Role: {user_role.capitalize()}\n"
            f"- College / Faculty ID: {college_id}\n"
            f"- Year Level: {year_lvl} (e.g. BE / Final Year, TE / 3rd Year, SE / 2nd Year, Faculty)\n"
            f"- Admission Batch: {batch}\n"
            f"- Academic Year: {acad_yr}\n"
            f"- Title: {ach.title}\n"
            f"- Event Name: {ach.event_name or 'N/A'}\n"
            f"- Category: {ach.category}\n"
            f"- Position / Rank: {ach.position or 'Participant'}\n"
            f"- Level: {ach.level or 'College'}\n"
            f"- Issuing Body / Organization: {ach.organization or ach.organizer or 'N/A'}\n"
            f"- Date: {ach.event_date or 'N/A'}"
        )
        records_context.append(record_str)

    full_context_text = "\n\n".join(records_context)

    prompt = f"""
    You are the intelligent AI Executive Assistant for the Information Technology (IT) Department Achievement Portal (AchieveIT) at the college.
    You assist the Head of Department (HOD) and Admin with data-driven insights, queries, rankings, student details, and department statistics.

    LIVE DEPARTMENT DATABASE RECORDS ({len(records)} Total Submissions):
    \"\"\"
    {full_context_text}
    \"\"\"

    USER QUERY:
    "{query}"

    INSTRUCTIONS FOR ACCURATE ANSWERING:
    1. Direct & Analytical Answers:
       - If the user asks a specific question (e.g., "how many students participate in hackathons from BE", "who won 1st prize", "list all publications", "summarize achievements for batch 2022-2026"):
         Give the exact count, name(s), and details directly in clear, professional markdown.
    2. Student / Faculty Profile Queries:
       - When presenting individual student or faculty details, use a clean structured layout:
         👤 **[Student/Faculty Name]** ([College ID]) — Year: [Year Level], Batch: [Batch]
         📊 **Total Achievements**: [Count] Records
         🏆 **Highlights**:
         • [Event / Title] — [Position / Rank] ([Category], [Level] Level, Date: [Date])
    3. Accuracy:
       - Rely strictly on the database records above.
       - BE students include both regular BE (`2022FH...`) and DSE Direct Second Year (`2024DS...`) in batch `2022-2026`.
       - TE students include batch `2023-2027` (`2023FH...`).
       - If no records match the criteria, clearly state that no records were found for that specific filter.
    """

    models_to_try = ["gemini-3.6-flash", "gemini-2.5-flash-latest"]
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    for model_name in models_to_try:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt
            )
            return response.text.strip()
        except Exception as e:
            print(f"Model {model_name} note: {e}")
            time.sleep(0.5)
            continue

    return "AI assistant is temporarily busy. Please try again."