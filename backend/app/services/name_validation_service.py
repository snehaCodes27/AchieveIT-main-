import re
from typing import Dict, Any, List, Optional

TITLE_PREFIXES = {"mr", "mrs", "ms", "miss", "dr", "prof", "shri", "smt", "kumari"}

def clean_name_string(name: str) -> str:
    """Cleans name string."""
    if not name:
        return ""
    cleaned = re.sub(r"\(.*?\)", " ", name)
    cleaned = re.sub(r"[^a-zA-Z\s]", " ", cleaned)
    words = cleaned.lower().split()
    filtered_words = [w for w in words if w not in TITLE_PREFIXES and len(w) > 0]
    return " ".join(filtered_words).strip()

def get_name_tokens(name: str) -> List[str]:
    cleaned = clean_name_string(name)
    return [t for t in cleaned.split() if len(t) >= 2]

def validate_participant_name(
    extracted_name: Optional[str],
    user_name: str,
    raw_ocr_text: Optional[str] = ""
) -> Dict[str, Any]:
    user_clean = clean_name_string(user_name)
    user_tokens = get_name_tokens(user_name)
    display_user_name = user_clean.title() if user_clean else user_name
    display_extracted_name = (extracted_name or "").strip()
    
    if not display_extracted_name:
        if raw_ocr_text:
            raw_lower = raw_ocr_text.lower()
            if any(token in raw_lower for token in user_tokens if len(token) >= 3):
                return {
                    "is_match": True,
                    "is_team": False,
                    "extracted_name": display_user_name,
                    "user_name": display_user_name,
                    "message": f"Certificate verified for {display_user_name} (found in document text)."
                }
        return {
            "is_match": True,
            "is_team": False,
            "extracted_name": display_user_name,
            "user_name": display_user_name,
            "message": "Certificate assigned to account."
        }

    extracted_clean = clean_name_string(display_extracted_name)
    extracted_tokens = get_name_tokens(display_extracted_name)

    is_team_cert = (
        "," in display_extracted_name or
        ";" in display_extracted_name or
        " and " in display_extracted_name.lower() or
        "&" in display_extracted_name or
        "team" in display_extracted_name.lower() or
        len(extracted_tokens) >= 5
    )

    # 1. Exact string match after cleaning
    if user_clean == extracted_clean:
        return {
            "is_match": True,
            "is_team": False,
            "extracted_name": display_extracted_name,
            "user_name": display_user_name,
            "message": f"Exact name match verified: {display_user_name}"
        }

    # 2. Token overlap analysis
    user_set = set(user_tokens)
    extracted_set = set(extracted_tokens)
    common_tokens = user_set.intersection(extracted_set)

    # Subset check
    if len(extracted_tokens) >= 2 and extracted_set.issubset(user_set):
        return {
            "is_match": True,
            "is_team": False,
            "extracted_name": display_extracted_name,
            "user_name": display_user_name,
            "message": f"Certificate name '{display_extracted_name}' matches your account '{display_user_name}'."
        }

    if len(user_tokens) >= 2 and user_set.issubset(extracted_set):
        return {
            "is_match": True,
            "is_team": is_team_cert,
            "extracted_name": display_extracted_name,
            "user_name": display_user_name,
            "message": f"Certificate name '{display_extracted_name}' matches your account '{display_user_name}'."
        }

    # If at least 2 key tokens match (e.g. First Name + Last Name)
    if len(common_tokens) >= 2:
        return {
            "is_match": True,
            "is_team": is_team_cert,
            "extracted_name": display_extracted_name,
            "user_name": display_user_name,
            "message": f"Certificate verified for {display_user_name}."
        }

    # 3. For team certificates, check if user's first and last name appear anywhere in the participant string or raw text
    if is_team_cert:
        combined_text = (display_extracted_name + " " + (raw_ocr_text or "")).lower()
        if len(user_tokens) >= 2:
            first_n = user_tokens[0]
            last_n = user_tokens[-1]
            if first_n in combined_text and last_n in combined_text:
                return {
                    "is_match": True,
                    "is_team": True,
                    "extracted_name": display_extracted_name,
                    "user_name": display_user_name,
                    "message": f"Team certificate verified! Your name ({display_user_name}) was found among the team members."
                }
        elif len(user_tokens) == 1 and user_tokens[0] in combined_text and len(user_tokens[0]) >= 4:
            return {
                "is_match": True,
                "is_team": True,
                "extracted_name": display_extracted_name,
                "user_name": display_user_name,
                "message": f"Team certificate verified for {display_user_name}."
            }

    # 4. Check if student's first + last name is directly in raw text as fallback
    if raw_ocr_text and len(user_tokens) >= 2:
        raw_clean = clean_name_string(raw_ocr_text)
        if user_tokens[0] in raw_clean and user_tokens[-1] in raw_clean:
            return {
                "is_match": True,
                "is_team": is_team_cert,
                "extracted_name": display_extracted_name,
                "user_name": display_user_name,
                "message": f"Certificate verified for {display_user_name} (found in document body)."
            }

    # 5. MISMATCH DETECTED
    return {
        "is_match": False,
        "is_team": is_team_cert,
        "extracted_name": display_extracted_name,
        "user_name": display_user_name,
        "message": f"Certificate name '{display_extracted_name}' does not match your account name '{display_user_name}'."
    }
