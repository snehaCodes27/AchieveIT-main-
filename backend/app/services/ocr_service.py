import os
import io
import json
import re

from PIL import Image
from pypdf import PdfReader
from google import genai
from google.genai import types

from app.core.config import settings


try:
    from rapidocr_onnxruntime import RapidOCR
    _rapid_ocr_engine = RapidOCR()
except Exception as e:
    print(f"[OCR Engine Notice] RapidOCR failed: {e}")
    _rapid_ocr_engine = None


GEMINI_API_KEY = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

VISION_MODELS = [
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.6-flash"
]


def optimize_image_for_api(image_path: str, max_dimension: int = 1024, quality: int = 75) -> bytes:
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

                img = img.resize(
                    (new_width, new_height),
                    Image.Resampling.LANCZOS
                )

            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=quality, optimize=True)

            return buffer.getvalue()

    except Exception as e:
        print(f"[Image Optimization Error] {e}")

        with open(image_path, "rb") as f:
            return f.read()


def extract_text_from_pdf(pdf_path: str) -> str:
    try:
        reader = PdfReader(pdf_path)
        text = ""

        for page in reader.pages[:2]:
            text += page.extract_text() or ""

        return text.strip()

    except Exception as e:
        print(f"[PDF Error] {e}")
        return ""


def extract_text(file_path: str) -> str:
    file_ext = os.path.splitext(file_path)[1].lower()

    if file_ext == ".pdf":
        pdf_text = extract_text_from_pdf(file_path)

        if len(pdf_text) > 30:
            return pdf_text

    if _rapid_ocr_engine:
        try:
            result, _ = _rapid_ocr_engine(file_path)

            if result:
                return " ".join(
                    line[1]
                    for line in result
                    if len(line) > 1
                ).strip()

        except Exception as e:
            print(f"[RapidOCR Error] {e}")

    return ""


def intelligent_fallback_classify(raw_text: str) -> dict:
    text_lower = (raw_text or "").lower()

    category = "Tech Competition"

    if any(k in text_lower for k in ["nptel", "swayam"]):
        category = "Certification"
    elif any(k in text_lower for k in [
        "vocal", "sing", "music", "dance", "cultural",
        "art", "drama", "sport", "athletic", "cricket",
        "badminton", "talent"
    ]):
        category = "Sports & Cultural"
    elif any(k in text_lower for k in [
        "intern", "internship", "stipend", "trainee"
    ]):
        category = "Internship"
    elif any(k in text_lower for k in [
        "paper", "publication", "ieee", "springer",
        "journal", "conference", "research"
    ]):
        category = "Publication"
    elif any(k in text_lower for k in [
        "hackathon", "hack", "coding competition",
        "codeathon", "hackblitz"
    ]):
        category = "Hackathon"
    elif any(k in text_lower for k in [
        "social", "nss", "volunteer", "blood donation",
        "rotaract", "ngo"
    ]):
        category = "Social Service"
    elif any(k in text_lower for k in [
        "fdp", "faculty development"
    ]):
        category = "FDP"
    elif any(k in text_lower for k in [
        "tech", "robotics", "project exhibition",
        "model competition", "techquest", "workshop",
        "symposium", "seminar"
    ]):
        category = "Tech Competition"

    position = "Participant"

    if "1st runner-up" in text_lower or "1st runner up" in text_lower:
        position = "1st Runner-Up"
    elif "2nd runner-up" in text_lower or "2nd runner up" in text_lower:
        position = "2nd Runner-Up"
    elif "1st place" in text_lower or "1st prize" in text_lower:
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


def extract_structured_fields(file_path: str, raw_text: str = "") -> dict:

    if not raw_text:
        raw_text = extract_text(file_path)

    raw_text = raw_text.strip()
    fallback_response = intelligent_fallback_classify(raw_text)

    if not client:
        return fallback_response

    prompt = """
You are an expert certificate parser.

Extract the following fields and return only valid JSON:

title
participant_name
category
organization
event_date
position
level
certificate_id
description

Category must be one of:
Hackathon, Tech Competition, Internship, Publication,
Sports & Cultural, Social Service, Certification, FDP.

Do not use Certification just because the document says
Certificate or Certificate of Participation.

Use:
Hackathon for hackathons and coding competitions.
Tech Competition for technical events and project exhibitions.
Internship for internships and trainee programs.
Publication for papers, journals and conferences.
Sports & Cultural for sports and cultural activities.
Certification only for NPTEL or SWAYAM certifications.
FDP for faculty development programs.

Level must be:
College, State, National or International.
"""

    # Use OCR text first
    if len(raw_text) >= 50:

        try:
            response = client.models.generate_content(
                model=VISION_MODELS[0],
                contents=prompt + "\n\nCertificate text:\n" + raw_text[:10000],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                    max_output_tokens=800
                )
            )

            if response and response.text:
                data = json.loads(response.text)

                if isinstance(data, dict):
                    return data

        except Exception as e:
            print(f"[Gemini Text Error] {e}")

    # Use Gemini Vision only if OCR was not enough
    file_ext = os.path.splitext(file_path)[1].lower()

    if file_ext in [".jpg", ".jpeg", ".png", ".webp"]:

        try:
            image_data = optimize_image_for_api(file_path)

            response = client.models.generate_content(
                model=VISION_MODELS[0],
                contents=[
                    types.Part.from_bytes(
                        data=image_data,
                        mime_type="image/jpeg"
                    ),
                    prompt
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                    max_output_tokens=800
                )
            )

            if response and response.text:
                data = json.loads(response.text)

                if isinstance(data, dict):
                    return data

        except Exception as e:
            print(f"[Gemini Vision Error] {e}")

    return fallback_response