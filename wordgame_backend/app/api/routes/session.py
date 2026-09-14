from fastapi import APIRouter

from app.schemas.session import SessionStartIn, SessionStartOut
from app.services.word_service import word_service
from app.services.user_client import user_client

router = APIRouter()


@router.post("/start", response_model=SessionStartOut)
async def start_session(payload: SessionStartIn):
    await user_client.save_username(payload.username)
    words = word_service.get_words(payload.difficulty, payload.username)
    return SessionStartOut(words=words)
