import csv
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def seed_users():
    db = SessionLocal()
    try:
        with open("it_students.csv", mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                college_id = row["college_id"].strip()
                name = row["name"].strip()
                role_str = row["role"].strip().lower()
                department = row["department"].strip()
                email = row["email"].strip() if row.get("email") else None

                # Default password is their own College ID
                default_password = college_id
                
                if role_str == "admin":
                    role = UserRole.ADMIN
                elif role_str == "teacher":
                    role = UserRole.TEACHER
                else:
                    role = UserRole.STUDENT

                # Check if user already exists
                existing_user = db.query(User).filter(User.college_id == college_id).first()
                if not existing_user:
                    user = User(
                        college_id=college_id,
                        name=name,
                        role=role,
                        department=department,
                        email=email,
                        hashed_password=get_password_hash(default_password)
                    )
                    db.add(user)
                    count += 1
                else:
                    existing_user.name = name
                    existing_user.role = role
                    existing_user.department = department
                    existing_user.email = email

            db.commit()
            print(f">>> SUCCESS: Loaded {count} users into Supabase database! <<<")
    except Exception as e:
        db.rollback()
        print(f"Error seeding users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()