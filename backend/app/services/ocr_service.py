import os
import io
import json
import re

from PIL import Image
from pypdf import PdfReader
from google import genai
from google.genai import types

from app.core.config import settings


# RapidOCR is kept only as optional text supplement, not primary extraction
try:
    from rapidocr_onnxruntime import RapidOCR
    _rapid_ocr_engine = RapidOCR()
except Exception as e:
    print(f"[OCR Engine Notice] RapidOCR not available: {e}")
    _rapid_ocr_engine = None


GEMINI_API_KEY = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

VISION_MODELS = [
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.6-flash",
]



def optimize_image_for_api(image_path: str, max_dimension: int = 1600, quality: int = 85) -> bytes:
    """Resize and compress an image for Gemini Vision API."""
    try:
        with Image.open(image_path) as img:
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            width, height = img.size

            if max(width, height) > max_dimension:
                if width > height:
                    new_width = max_dimension
                    new_height = int(height * max_dimension / width)
                else:
                    new_height = max_dimension
                    new_width = int(width * max_dimension / height)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=quality, optimize=True)
            return buffer.getvalue()

    except Exception as e:
        print(f"[Image Optimization Error] {e}")
        with open(image_path, "rb") as f:
            return f.read()


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract plain text from a PDF (native text layer only)."""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages[:2]:
            text += page.extract_text() or ""
        return text.strip()
    except Exception as e:
        print(f"[PDF Error] {e}")
        return ""


def extract_text_rapidocr(file_path: str) -> str:
    """Use RapidOCR to extract raw text from an image (supplemental only)."""
    if not _rapid_ocr_engine:
        return ""
    try:
        result, _ = _rapid_ocr_engine(file_path)
        if result:
            return " ".join(line[1] for line in result if len(line) > 1).strip()
    except Exception as e:
        print(f"[RapidOCR Error] {e}")
    return ""


def extract_text(file_path: str) -> str:
    """
    Primary text extraction used for duplicate-check / quick preview.
    For images: tries RapidOCR; for PDFs: native text layer.
    Gemini Vision extraction happens separately in extract_structured_fields().
    """
    file_ext = os.path.splitext(file_path)[1].lower()

    if file_ext == ".pdf":
        pdf_text = extract_text_from_pdf(file_path)
        if len(pdf_text) > 30:
            return pdf_text

    # For images, use RapidOCR as a quick text getter
    return extract_text_rapidocr(file_path)


def intelligent_fallback_classify(raw_text: str) -> dict:
    """Rule-based fallback when Gemini is unavailable."""
    text_lower = (raw_text or "").lower()

    category = "Tech Competition"

    if any(k in text_lower for k in ["nptel", "swayam"]):
        category = "Certification"
    elif any(k in text_lower for k in [
        "vocal", "sing", "music", "dance", "cultural",
        "art", "drama", "sport", "athletic", "cricket",
        "badminton", "talent", "400m", "relay", "marathon"
    ]):
        category = "Sports & Cultural"
    elif any(k in text_lower for k in ["intern", "internship", "stipend", "trainee"]):
        category = "Internship"
    elif any(k in text_lower for k in [
        "paper", "publication", "ieee", "springer",
        "journal", "conference", "research"
    ]):
        category = "Publication"
    elif any(k in text_lower for k in [
        "hackathon", "hack", "coding competition", "codeathon", "hackblitz"
    ]):
        category = "Hackathon"
    elif any(k in text_lower for k in [
        "social", "nss", "volunteer", "blood donation", "rotaract", "ngo"
    ]):
        category = "Social Service"
    elif any(k in text_lower for k in ["fdp", "faculty development"]):
        category = "FDP"

    position = "Participant"
    if "1st runner-up" in text_lower or "1st runner up" in text_lower:
        position = "1st Runner-Up"
    elif "2nd runner-up" in text_lower or "2nd runner up" in text_lower:
        position = "2nd Runner-Up"
    elif "1st place" in text_lower or "1st prize" in text_lower or "first place" in text_lower:
        position = "1st Place"
    elif "2nd place" in text_lower or "2nd prize" in text_lower:
        position = "2nd Place"
    elif "winner" in text_lower:
        position = "Winner"

    level = "College"
    if "international" in text_lower:
        level = "International"
    elif "national" in text_lower:
        level = "National"
    elif "state" in text_lower:
        level = "State"

    title = "Technical Achievement"
    match = re.search(r'["\']([^"\']{6,60})["\']', raw_text)
    if match:
        title = match.group(1)

    return {
        "title": title,
        "participant_name": "",
        "category": category,
        "organization": "Organizing Committee",
        "event_date": "",
        "position": position,
        "level": level,
        "certificate_id": "",
        "description": f"Verified achievement in category {category}."
    }


# ─────────────────────────────────────────────────────────────
# Extraction prompt — shared by Vision and text-only paths
# ─────────────────────────────────────────────────────────────
_EXTRACTION_PROMPT = """You are an expert certificate parser.

Read the certificate carefully and extract the following fields.
Return ONLY valid JSON with exactly these keys:

{
  "title": "short descriptive title of the achievement",
  "participant_name": "full name of the person awarded",
  "category": "one of: Hackathon | Tech Competition | Internship | Publication | Sports & Cultural | Social Service | Certification | FDP",
  "organization": "full name of the issuing organization",
  "event_date": "date in YYYY-MM-DD format, or empty string if not found",
  "position": "e.g. 1st Place | 2nd Place | Winner | Participant | etc.",
  "level": "one of: College | State | National | International",
  "certificate_id": "certificate number/ID if present, else empty string",
  "description": "one sentence summary of the achievement"
}

Category rules:
- Use Sports & Cultural for sports events, athletic competitions, cultural programs, music, dance, drama.
- Use Hackathon only for hackathons and coding competitions.
- Use Tech Competition for technical fests, project exhibitions, workshops, seminars.
- Use Internship for internship and trainee programs.
- Use Publication for papers, journals, IEEE/Springer conferences.
- Use Certification ONLY for NPTEL or SWAYAM course certifications.
- Use Social Service for NSS, volunteer, NGO activities.
- Use FDP for faculty development programs.
- Do NOT use Certification just because the document says "Certificate of Participation".

Level rules:
- Default to College unless the text clearly mentions State, National or International.

Return only the JSON object, no markdown, no explanation.
"""


def extract_structured_fields(file_path: str, raw_text: str = "") -> dict:
    """
    Primary extraction pipeline:
      1. Gemini Vision (image) — most accurate, used first for image files.
      2. Gemini text-only — used for PDFs with native text, or as Vision fallback.
      3. Rule-based fallback — used when Gemini is unavailable.
    """
    fallback_response = intelligent_fallback_classify(raw_text)

    if not client:
        print("[OCR] Gemini client not initialised — using rule-based fallback.")
        return fallback_response

    file_ext = os.path.splitext(file_path)[1].lower()

    # ── Path A: Image certificate → Gemini Vision (PRIMARY) ──────────────
    if file_ext in (".jpg", ".jpeg", ".png", ".webp"):
        try:
            image_data = optimize_image_for_api(file_path)
            for model_name in VISION_MODELS:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=[
                            types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                            _EXTRACTION_PROMPT,
                        ],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.1,
                            max_output_tokens=800,
                        ),
                    )

                    if response and response.text:
                        data = json.loads(response.text)
                        if isinstance(data, dict) and data.get("participant_name"):
                            print(f"[OCR] Gemini Vision extraction succeeded with model {model_name}.")
                            return data
                except Exception as model_err:
                    print(f"[Gemini Vision Error with {model_name}] {model_err}")
                    continue

        except Exception as e:
            print(f"[Gemini Vision Optimization/Call Error] {e}")


    # ── Path B: PDF / Vision fallback → Gemini text-only ─────────────────
    # Use native PDF text if available, else whatever RapidOCR gave us.
    text_for_gemini = raw_text.strip()

    if not text_for_gemini and file_ext == ".pdf":
        text_for_gemini = extract_text_from_pdf(file_path)

    if not text_for_gemini:
        text_for_gemini = extract_text_rapidocr(file_path) if file_ext in (".jpg", ".jpeg", ".png", ".webp") else ""

    if len(text_for_gemini) >= 30:
        for model_name in VISION_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=_EXTRACTION_PROMPT + "\n\nCertificate text:\n" + text_for_gemini[:10000],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.1,
                        max_output_tokens=800,
                    ),
                )

                if response and response.text:
                    data = json.loads(response.text)
                    if isinstance(data, dict):
                        print(f"[OCR] Gemini text-only extraction succeeded with model {model_name}.")
                        return data

            except Exception as e:
                print(f"[Gemini Text Error with {model_name}] {e}")
                continue

    print("[OCR] All Gemini paths failed — using rule-based fallback.")
    return fallback_response
