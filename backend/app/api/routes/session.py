from fastapi import APIRouter

from app.schemas.session import SessionStartIn, SessionStartOut, SessionEndIn, SessionEndOut
from app.services.word_service import word_service
from app.services.user_client import user_client
from utils.manage_users import update_score, get_top_scorer

router = APIRouter()


@router.post("/start", response_model=SessionStartOut)
async def start_session(payload: SessionStartIn):
    await user_client.save_username(payload.username, payload.difficulty)
    words = word_service.get_words(payload.difficulty, payload.username)
    return SessionStartOut(words=words)

@router.post("/gameover", response_model=SessionEndOut)
async def end_game(payload: SessionEndIn):
    difficulty = user_client.get_difficulty()
    update_score(user_client.get_username(), payload.score, difficulty)
    top_scorer = get_top_scorer(difficulty)
    print(top_scorer)
    return SessionEndOut(top_scorer=top_scorer)