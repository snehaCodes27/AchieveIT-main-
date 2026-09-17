import os
import sys
import pandas as pd

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

# ==============================================================================
# OPTION 1: PASTE YOUR EXCEL / CSV DATA DIRECTLY HERE (TAB OR COMMA SEPARATED)
# If you don't have a file path, you can just paste the rows from Excel below:
# ==============================================================================
raw_faculty_data = """
Faculty ID	Faculty Name	Email	Designation
2024DITP01	Prof. Priya Deshmukh	priya.deshmukh@clg.ac.in	Assistant Professor
2024DITP02	Dr. Rajesh Sharma	rajesh.sharma@clg.ac.in	Associate Professor
"""

# ==============================================================================
# OPTION 2: SPECIFY EXCEL FILE PATH (.xlsx or .xls or .csv)
# If you have an Excel file on your computer, put the path here:
# Examples:
# EXCEL_FILE_PATH = r"C:\Users\sneha\OneDrive\Desktop\faculty_data.xlsx"
# EXCEL_FILE_PATH = "faculty_data.xlsx"
# ==============================================================================
EXCEL_FILE_PATH = "faculty_data.xlsx"


def find_possible_excel_file():
    """Searches common locations if the default path is not found."""
    candidates = [
        EXCEL_FILE_PATH,
        os.path.join(os.path.dirname(__file__), "faculty.xlsx"),
        os.path.join(os.path.dirname(__file__), "faculty_data.xlsx"),
        os.path.join(os.path.dirname(__file__), "teachers.xlsx"),
        r"C:\Users\sneha\OneDrive\Desktop\faculty_data.xlsx",
        r"C:\Users\sneha\OneDrive\Desktop\faculty.xlsx",
        r"C:\Users\sneha\OneDrive\Desktop\teachers.xlsx",
        r"C:\Users\sneha\OneDrive\Desktop\department\faculty_data.xlsx",
        r"C:\Users\sneha\OneDrive\Desktop\department\faculty.xlsx",
    ]
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return None


def normalize_column_name(col):
    return str(col).strip().lower().replace("_", " ").replace("-", " ")


def import_faculty():
    db = SessionLocal()
    try:
        df = None
        excel_path = find_possible_excel_file()

        if excel_path and os.path.exists(excel_path):
            print(f"📖 Found Excel file at: {excel_path}")
            if excel_path.endswith(".csv"):
                df = pd.read_csv(excel_path)
            else:
                df = pd.read_excel(excel_path)
        else:
            print("ℹ️ No Excel file found at default locations. Parsing raw text data...")
            import io
            # Clean raw text
            cleaned_lines = [l for l in raw_faculty_data.strip().split("\n") if l.strip()]
            if len(cleaned_lines) > 1:
                delimiter = "\t" if "\t" in cleaned_lines[0] else ","
                df = pd.read_csv(io.StringIO("\n".join(cleaned_lines)), sep=delimiter)

        if df is None or df.empty:
            print("❌ No faculty data could be loaded. Please check the file path or paste rows into raw_faculty_data.")
            return

        print(f"📊 Processing {len(df)} rows from faculty sheet...")
        print(f"📋 Columns found: {list(df.columns)}")

        # Map column names flexibly
        id_col = None
        name_col = None
        email_col = None

        for col in df.columns:
            norm = normalize_column_name(col)
            if any(k in norm for k in ["id", "faculty id", "emp id", "employee id", "code", "prof id", "t_id"]):
                id_col = col
            elif any(k in norm for k in ["name", "faculty name", "professor", "teacher name"]):
                name_col = col
            elif any(k in norm for k in ["email", "mail", "gmail"]):
                email_col = col

        if not id_col:
            # Fallback to column 0 or 1
            id_col = df.columns[0]
        if not name_col:
            name_col = df.columns[1] if len(df.columns) > 1 else df.columns[0]

        print(f"🔑 Using columns -> ID: '{id_col}', Name: '{name_col}', Email: '{email_col}'")

        imported_count = 0
        updated_count = 0

        for idx, row in df.iterrows():
            raw_id = str(row[id_col]).strip() if pd.notna(row[id_col]) else ""
            raw_name = str(row[name_col]).strip() if pd.notna(row[name_col]) else ""
            raw_email = str(row[email_col]).strip() if email_col and pd.notna(row[email_col]) else ""

            if not raw_id or raw_id.lower() == "nan" or not raw_name or raw_name.lower() == "nan":
                continue

            # Fallback email if missing
            if not raw_email or raw_email.lower() == "nan" or "@" not in raw_email:
                clean_name = raw_name.lower().replace("prof.", "").replace("dr.", "").strip().replace(" ", ".")
                raw_email = f"{clean_name}@clg.ac.in"

            # Check if user already exists by college_id or email
            existing_user = db.query(User).filter(
                (User.college_id == raw_id) | (User.email == raw_email)
            ).first()

            # Default initial password is their Faculty ID or 'Welcome@123'
            default_password_hash = get_password_hash("Welcome@123")

            if existing_user:
                existing_user.name = raw_name
                existing_user.college_id = raw_id
                existing_user.email = raw_email
                existing_user.role = UserRole.TEACHER
                existing_user.academic_year = "2024-2025"
                existing_user.current_year_level = "Faculty"
                existing_user.admission_batch = "Faculty"
                existing_user.status = "Active"
                updated_count += 1
            else:
                new_user = User(
                    college_id=raw_id,
                    name=raw_name,
                    email=raw_email,
                    hashed_password=default_password_hash,
                    role=UserRole.TEACHER,
                    academic_year="2024-2025",
                    current_year_level="Faculty",
                    admission_batch="Faculty",
                    status="Active"
                )
                db.add(new_user)
                imported_count += 1

        db.commit()
        print("\n" + "=" * 50)
        print(f"✅ SUCCESS: {imported_count} new faculty added, {updated_count} existing faculty updated.")
        print(f"🔑 Default login password for all imported faculty: Welcome@123")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"❌ Error during faculty import: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    import_faculty()
