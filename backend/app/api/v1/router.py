from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, ocr, achievements, rag

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(ocr.router, prefix="/ocr", tags=["AI OCR"])
api_router.include_router(achievements.router, prefix="/achievements", tags=["Achievements"])
api_router.include_router(rag.router, prefix="/rag", tags=["RAG Assistant"])