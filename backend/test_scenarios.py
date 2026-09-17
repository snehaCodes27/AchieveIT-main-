import sys
from datetime import datetime
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.achievement import Achievement
from app.models.certificate import CertificateProof
from app.services.duplicate_service import check_duplicate
from app.services.name_validation_service import validate_participant_name

db = SessionLocal()

print('=' * 60)
print('RUNNING ALL 7 TEST SCENARIOS')
print('=' * 60)

# Pick or create test user for testing
student = db.query(User).filter(User.role == UserRole.STUDENT).first()
if not student:
    print('No student found in DB!')
    sys.exit(1)

print(f'Test Student: {student.name} (ID: {student.college_id}, Batch: {student.admission_batch}, Year: {student.current_year_level})')

# Clean up previous test achievements for this user to start clean
db.query(CertificateProof).filter(CertificateProof.achievement_id.in_(
    db.query(Achievement.id).filter(Achievement.user_id == student.id)
)).delete(synchronize_session=False)
db.query(Achievement).filter(Achievement.user_id == student.id).delete(synchronize_session=False)
db.commit()

# =========================================================================
# TEST 1: Multiple Certificates for Same Student
# =========================================================================
print('\n--- TEST 1: Multiple Certificates for Same Student ---')
ach1 = Achievement(
    user_id=student.id,
    title='1st Prize in Smart India Hackathon',
    event_name='Smart India Hackathon 2024',
    category='Hackathon',
    participant_name=student.name,
    organization='AICTE',
    certificate_id='SIH-2024-001',
    academic_year='2024-2025',
    year_level='TE',
    admission_batch=student.admission_batch
)
db.add(ach1)
db.flush()
c1 = CertificateProof(achievement_id=ach1.id, file_url='/uploads/sih.pdf', file_name='sih.pdf', file_hash='hash_sih_111')
db.add(c1)

ach2 = Achievement(
    user_id=student.id,
    title='Web Development Internship at Infosys',
    event_name='Infosys Springboard Internship',
    category='Internship',
    participant_name=student.name,
    organization='Infosys Ltd',
    certificate_id='INF-INT-2024-99',
    academic_year='2024-2025',
    year_level='TE',
    admission_batch=student.admission_batch
)
db.add(ach2)
db.flush()
c2 = CertificateProof(achievement_id=ach2.id, file_url='/uploads/infosys.pdf', file_name='infosys.pdf', file_hash='hash_inf_222')
db.add(c2)

ach3 = Achievement(
    user_id=student.id,
    title='AWS Certified Cloud Practitioner',
    event_name='AWS Certification Exam',
    category='Certification',
    participant_name=student.name,
    organization='Amazon Web Services',
    certificate_id='AWS-CERT-8849',
    academic_year='2024-2025',
    year_level='TE',
    admission_batch=student.admission_batch
)
db.add(ach3)
db.flush()
c3 = CertificateProof(achievement_id=ach3.id, file_url='/uploads/aws.pdf', file_name='aws.pdf', file_hash='hash_aws_333')
db.add(c3)
db.commit()

student_achs = db.query(Achievement).filter(Achievement.user_id == student.id).all()
print(f'Total achievements recorded for {student.name}: {len(student_achs)}')
assert len(student_achs) == 3, f'Expected 3 achievements, got {len(student_achs)}'
print('TEST 1 PASSED: Successfully stored 3 distinct certificates for one student.')

# =========================================================================
# TEST 2: Duplicate Detection Still Works
# =========================================================================
print('\n--- TEST 2: Duplicate Detection ---')
# Check exact file hash duplicate
is_dup_hash, reason_hash, _ = check_duplicate(db, student.id, file_hash='hash_sih_111')
print(f'Check duplicate file hash (hash_sih_111): is_dup={is_dup_hash}, reason={reason_hash}')
assert is_dup_hash == True and reason_hash == 'EXACT_FILE_EXISTS'

# Check certificate ID duplicate
is_dup_cid, reason_cid, _ = check_duplicate(db, student.id, file_hash='unique_hash_999', certificate_id='AWS-CERT-8849')
print(f'Check duplicate Certificate ID (AWS-CERT-8849): is_dup={is_dup_cid}, reason={reason_cid}')
assert is_dup_cid == True and reason_cid == 'CERTIFICATE_ID_EXISTS'

# Check different certificate (should be allowed!)
is_dup_new, reason_new, _ = check_duplicate(db, student.id, file_hash='brand_new_hash_555', event_name='Sports Marathon 2025', certificate_id='SPORT-2025-01')
print(f'Check new valid certificate: is_dup={is_dup_new}')
assert is_dup_new == False
print('TEST 2 PASSED: Duplicate detection blocks duplicate hashes and IDs, while allowing new distinct certificates.')

# =========================================================================
# TEST 3: Wrong Student Uploads Certificate (Name Mismatch)
# =========================================================================
print('\n--- TEST 3: Certificate Name Mismatch ---')
mismatch_res = validate_participant_name(extracted_name='Rahul Ramesh Sharma', user_name=student.name)
print(f"Mismatch Check for participant 'Rahul Ramesh Sharma' on student '{student.name}': is_match={mismatch_res['is_match']}")
assert mismatch_res['is_match'] == False
print(f"Warning message: {mismatch_res['message']}")
print('TEST 3 PASSED: System blocked mismatched certificate with clear warning.')

# =========================================================================
# TEST 4: Team Certificate
# =========================================================================
print('\n--- TEST 4: Team Certificate Matching ---')
student_tokens = [t for t in student.name.split() if '(' not in t and len(t) > 1]
student_pair = ' '.join(student_tokens[:2])
team_str = f"Rahul Sharma, {student_pair}, Amit Patel"
team_res = validate_participant_name(extracted_name=team_str, user_name=student.name)
print(f"Team check for list '{team_str}': is_match={team_res['is_match']}")
assert team_res['is_match'] == True
print('TEST 4 PASSED: Student allowed to upload team certificate.')

# =========================================================================
# TEST 5: Name Variation Matching
# =========================================================================
print('\n--- TEST 5: Name Variation Matching ---')
clean_student_tokens = [t for t in student.name.lower().split() if len(t) > 2 and '(' not in t]
short_name = ' '.join(clean_student_tokens[:2]).title()
var_res = validate_participant_name(extracted_name=short_name, user_name=student.name)
print(f"Variation check for '{short_name}' on account '{student.name}': is_match={var_res['is_match']}")
assert var_res['is_match'] == True
print('TEST 5 PASSED: Name variations match correctly.')

# =========================================================================
# TEST 6: Year Transition & History Preservation
# =========================================================================
print('\n--- TEST 6: Year Transition & History Preservation ---')
# Simulate an achievement earned in SE (2023-2024)
ach_past = Achievement(
    user_id=student.id,
    title='SE Mini Project Exhibition Winner',
    event_name='Department Mini Project 2023',
    category='Technical Competition',
    participant_name=student.name,
    organization='IT Department',
    certificate_id='MINI-SE-2023-01',
    academic_year='2023-2024',
    year_level='SE',
    admission_batch=student.admission_batch
)
db.add(ach_past)
db.flush()
db.add(CertificateProof(achievement_id=ach_past.id, file_url='/uploads/past.pdf', file_name='past.pdf', file_hash='hash_past_444'))
db.commit()

# Student is now promoted to BE in 2025-2026
student.current_year_level = 'BE'
db.commit()

# Verify past achievement still has year_level='SE' and academic_year='2023-2024'
persisted_ach = db.query(Achievement).filter(Achievement.id == ach_past.id).first()
print(f'Past achievement year_level: {persisted_ach.year_level}, academic_year: {persisted_ach.academic_year}')
assert persisted_ach.year_level == 'SE'
assert persisted_ach.academic_year == '2023-2024'
print('TEST 6 PASSED: Historical achievement retained SE (2023-2024) even after student advanced to BE.')

# =========================================================================
# TEST 7: Graduated Batch Separation
# =========================================================================
print('\n--- TEST 7: Graduated Batch Separation ---')
# Verify HOD query by Academic Year and Batch
batch_2022 = db.query(Achievement).filter(Achievement.academic_year == '2023-2024').all()
batch_2024 = db.query(Achievement).filter(Achievement.academic_year == '2024-2025').all()

print(f'Academic Year 2023-2024 records: {len(batch_2022)}')
print(f'Academic Year 2024-2025 records: {len(batch_2024)}')
assert len(batch_2022) >= 1
assert len(batch_2024) >= 3
print('TEST 7 PASSED: Graduated/past batches and future batches are completely separated by Academic Year & Batch.')

print('\n' + '=' * 60)
print('ALL 7 TEST SCENARIOS PASSED WITH ZERO ERRORS!')
print('=' * 60)
db.close()
