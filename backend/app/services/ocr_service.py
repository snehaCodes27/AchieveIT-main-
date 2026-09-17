import os
import io
import json
import re
from PIL import Image
from pypdf import PdfReader
from google import genai
from google.genai import types
from app.core.config import settings

# Initialize RapidOCR Engine (Fast local ONNX OCR ~0.1s - 0.5s)
try:
    from rapidocr_onnxruntime import RapidOCR
    _rapid_ocr_engine = RapidOCR()
except Exception as e:
    print(f"[OCR Engine Notice] RapidOCR failed to initialize: {e}")
    _rapid_ocr_engine = None

# Initialize Gemini Client
GEMINI_API_KEY = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

# Active Gemini Flash models (gemini-3.6-flash is primary)
VISION_MODELS = ["gemini-3.6-flash", "gemini-2.5-flash-latest"]


def optimize_image_for_api(image_path: str, max_dimension: int = 1024, quality: int = 80) -> bytes:
    """
    Downscales image in-memory to <100KB for lightning-fast network transfer to Gemini.
    """
    try:
        with Image.open(image_path) as img:
            # Convert RGBA/P to RGB for clean JPEG compression
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Scale down if larger than max_dimension
            width, height = img.size
            if max(width, height) > max_dimension:
                if width > height:
                    new_width = max_dimension
                    new_height = int((height * max_dimension) / width)
                else:
                    new_height = max_dimension
                    new_width = int((width * max_dimension) / height)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=quality, optimize=True)
            return buffer.getvalue()
    except Exception as e:
        print(f"[OCR Optimizer Error] {e}")
        with open(image_path, "rb") as f:
            return f.read()


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Fast digital PDF text extraction (takes ~0.02s).
    """
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages[:2]:  # only read first 2 pages max
            text += page.extract_text() or ""
        return text.strip()
    except Exception:
        return ""


def extract_text(file_path: str) -> str:
    """
    Fast extraction helper for raw text using RapidOCR (images) and PyPDF (PDFs).
    """
    file_ext = os.path.splitext(file_path)[1].lower()
    
    if file_ext == ".pdf":
        pdf_text = extract_text_from_pdf(file_path)
        if len(pdf_text) > 30:
            return pdf_text
            
    # For images or scanned PDFs: use RapidOCR
    if _rapid_ocr_engine:
        try:
            result, _ = _rapid_ocr_engine(file_path)
            if result:
                return " ".join([line[1] for line in result]).strip()
        except Exception as e:
            print(f"[RapidOCR Error] {e}")

    return ""


def intelligent_fallback_classify(raw_text: str) -> dict:
    """
    Intelligent keyword-based rule fallback when Gemini vision is unavailable.
    Never blindly defaults everything to 'Hackathon'.
    """
    text_lower = (raw_text or "").lower()

    category = "Certification"
    if any(k in text_lower for k in ["vocal", "sing", "music", "dance", "cultural", "art", "drama", "sport", "athletic", "cricket", "badminton", "symphony", "talent"]):
        category = "Sports & Cultural"
    elif any(k in text_lower for k in ["intern", "internship", "stipend", "trainee"]):
        category = "Internship"
    elif any(k in text_lower for k in ["paper", "publication", "ieee", "springer", "journal", "conference", "research"]):
        category = "Publication"
    elif any(k in text_lower for k in ["hackathon", "hack", "coding competition", "codeathon"]):
        category = "Hackathon"
    elif any(k in text_lower for k in ["tech", "robotics", "project exhibition", "model competition", "techquest"]):
        category = "Tech Competition"
    elif any(k in text_lower for k in ["fdp", "faculty development"]):
        category = "FDP"
    elif any(k in text_lower for k in ["social", "nss", "volunteer", "blood donation", "rotaract", "ngo"]):
        category = "Social Service"

    # Extract rank / position
    position = "Participant"
    if "1st runner-up" in text_lower or "1st runner up" in text_lower or "first runner up" in text_lower:
        position = "1st Runner-Up"
    elif "2nd runner-up" in text_lower or "2nd runner up" in text_lower:
        position = "2nd Runner-Up"
    elif "1st place" in text_lower or "1st prize" in text_lower or "first prize" in text_lower:
        position = "1st Place"
    elif "2nd place" in text_lower or "2nd prize" in text_lower:
        position = "2nd Place"
    elif "winner" in text_lower:
        position = "Winner"

    # Extract level
    level = "College"
    if "international" in text_lower:
        level = "International"
    elif "national" in text_lower:
        level = "National"
    elif "state" in text_lower:
        level = "State"
    elif "inter-college" in text_lower or "inter college" in text_lower:
        level = "College"

    # Title detection
    title = "Certificate of Merit"
    title_match = re.search(r'["\']([^"\']{6,60})["\']', raw_text)
    if title_match:
        title = title_match.group(1)

    return {
        "title": title,
        "participant_name": "",
        "category": category,
        "organization": "Organizing Committee",
        "event_date": "",
        "position": position,
        "level": level,
        "certificate_id": "",
        "description": f"Verified certificate in category {category}."
    }


def extract_structured_fields(file_path: str, raw_text: str = "") -> dict:
    """
    Single-pass Ultra-Fast Gemini Flash Vision & JSON extraction.
    Falls back gracefully to intelligent local OCR classification if cloud call fails.
    """
    if not raw_text:
        raw_text = extract_text(file_path)

    fallback_response = intelligent_fallback_classify(raw_text)

    if not client:
        print("[OCR Warning] GEMINI_API_KEY not set. Using intelligent local OCR fallback.")
        return fallback_response

    file_ext = os.path.splitext(file_path)[1].lower()

    prompt = (
        "You are an expert AI certificate parser for college achievement portals. "
        "Extract the following information from this certificate into pure JSON:\n"
        "- title: exact event name or achievement title (e.g. 'National AI Hackathon 2025')\n"
        "- participant_name: full name of the student/person awarded\n"
        "- category: strictly one of ['Hackathon', 'Internship', 'Certification', 'Publication', 'Tech Competition', 'Sports & Cultural', 'Social Service', 'FDP', 'Paper Publication']\n"
        "- organization: issuing organization/college/institute/company\n"
        "- event_date: date in YYYY-MM-DD or readable date string\n"
        "- position: position or rank (e.g. '1st Runner-Up', 'Winner', 'Participant')\n"
        "- level: one of ['College', 'State', 'National', 'International']\n"
        "- certificate_id: certificate ID or verification code if visible, else empty string\n"
        "- description: concise 1-sentence summary\n"
    )

    for model_name in VISION_MODELS:
        try:
            # Case 1: Image File -> Direct Fast Vision Scan
            if file_ext in [".jpg", ".jpeg", ".png", ".webp"]:
                img_bytes = optimize_image_for_api(file_path)

                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                        prompt,
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1,
                        max_output_tokens=1500,
                    ),
                )

                if response and response.text:
                    parsed = json.loads(response.text)
                    if isinstance(parsed, dict):
                        return parsed

            # Case 2: PDF File -> Fast Text or Vision
            elif file_ext == ".pdf":
                pdf_text = raw_text or extract_text_from_pdf(file_path)
                
                if len(pdf_text) > 30:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=f"{prompt}\n\nCERTIFICATE TEXT:\n{pdf_text}",
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.1,
                            max_output_tokens=1500,
                        ),
                    )
                    if response and response.text:
                        parsed = json.loads(response.text)
                        if isinstance(parsed, dict):
                            return parsed
                
                # If scanned PDF with no text, upload bytes
                with open(file_path, "rb") as f:
                    pdf_bytes = f.read()

                response = client.models.generate_content(
                    model=model_name,
                    contents=[
                        types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"),
                        prompt,
                    ],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1,
                        max_output_tokens=1500,
                    ),
                )
                if response and response.text:
                    parsed = json.loads(response.text)
                    if isinstance(parsed, dict):
                        return parsed

        except Exception as e:
            print(f"[Gemini OCR Attempt ({model_name}) Note] {e}")
            continue

    return fallback_response