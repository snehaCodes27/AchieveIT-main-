import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.v1.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded certificates so HOD/Admin can view them in browser
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Warm up database connection pool on startup
@app.on_event("startup")
def startup_warmup():
    try:
        from app.db.session import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print("[Startup] Database connection pool initialized and warmed up.")
    except Exception as e:
        print(f"[Startup Warning] DB warm-up failed: {e}")

# Health check endpoint (used for pre-warming and keep-alive pings)
@app.get("/api/health", tags=["Health"])
def health_check():
    db_status = "ok"
    try:
        from app.db.session import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        db_status = f"error: {e}"

    return {
        "status": "healthy",
        "database": db_status,
        "app": settings.PROJECT_NAME,
        "version": "1.0.0"
    }

# Include API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)