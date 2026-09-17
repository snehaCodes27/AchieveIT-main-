# 🎓 AchieveIT — AI-Powered Institutional Achievement Management System

> **An intelligent, multimodal achievement management and verification portal for higher educational institutions.**  
> Powered by **FastAPI**, **React (Vite)**, and **Google Gemini 3.6 Flash**.

---

## 🌟 Key Features

- 📄 **Multimodal AI OCR Auto-Fill**: Automatically extracts title, category, issuing organization, dates, position/rank, and certificate IDs from images and PDFs using Gemini Vision.
- 🛡️ **Zero-Latency Duplicate Detection**: Instant SHA-256 cryptographic hash matching prevents duplicate file uploads in 0.008 seconds.
- 👤 **Student Ownership Safeguard**: Levenshtein & Jaro-Winkler fuzzy matching verifies certificate owner identity against registered student names.
- 🎓 **Student Dashboard**: 7 categorised views (Hackathons, Internships, Certifications, Publications, Technical Competitions, Sports & Cultural, Social Service) with interactive in-app certificate viewer.
- 📚 **Professor Dashboard**: 5 faculty categories (FDP, Courses & Certifications, Paper Publications, Presentations & Talks, Other Professional Activities).
- 🏛️ **HOD / Admin Command Center**: Cohort drilldowns (SE, TE, BE, Graduated), bulk CSV onboarding, NBA/NAAC export, and real-time analytics.
- 🤖 **Executive RAG Assistant**: Natural language AI chat answering institutional queries using live database records.

---

## 🏗️ Project Architecture

```
ai-achievement-management-system/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/  # API routers (auth, users, ocr, achievements, rag)
│   │   ├── core/              # Security, JWT tokens, config
│   │   ├── db/                # SQLAlchemy session & base
│   │   ├── models/            # User, Achievement, Certificate models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── services/          # OCR, Duplicate, Name Validation, RAG
│   ├── uploads/               # Uploaded certificate proofs
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Backend environment template
├── frontend/
│   ├── src/
│   │   ├── components/        # SplashScreen, UI widgets
│   │   ├── context/           # AuthContext (JWT session management)
│   │   ├── pages/             # Student, Teacher, Admin, and Auth views
│   │   ├── services/          # Axios / Fetch API client
│   │   └── styles/            # Unified CSS stylesheets
│   ├── package.json           # Frontend dependencies
│   └── vite.config.js         # Vite build configuration
└── .gitignore                 # Git ignore rules
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18+ recommended)
- **Python** (v3.10+ recommended)
- **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))
- **Git** (for version control)

---

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from template
cp .env.example .env
# Edit .env and paste your GEMINI_API_KEY and SECRET_KEY

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*The backend API will run at `http://localhost:8000` (Docs available at `http://localhost:8000/docs`).*

---

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start development server
npm run dev
```
*The frontend application will open at `http://localhost:5173`.*

---

## 🔐 Default Credentials

| Role | Username / College ID | Default Password |
| :--- | :--- | :--- |
| **HOD / Admin** | `HOD_IT` | `HOD_IT` |
| **Professor** | `T001` | `T001` |
| **BE Student** | `2024DSIT012` | `2024DSIT012` |
| **TE Student** | `2023FHIT001` | `2023FHIT001` |

*(Users can update their passwords and profile photos anytime in their Profile modal).*

---

## 📜 License
This project is licensed under the **MIT License**.
