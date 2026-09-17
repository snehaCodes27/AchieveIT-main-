from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.rag_service import ask_rag_assistant

router = APIRouter()

class RagQueryRequest(BaseModel):
    query: str

@router.post("/query")
def query_rag_assistant(
    request: RagQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    answer = ask_rag_assistant(request.query.strip(), db)
    return {
        "query": request.query,
        "answer": answer
    }