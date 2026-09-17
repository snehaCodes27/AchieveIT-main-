@echo off
echo Starting AI Achievement Management System...
start cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
start cmd /k "cd frontend && npm run dev"
echo Done! Both servers are starting up!