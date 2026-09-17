from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool

from app.schemas.score_board import ScoreBoardOut
from app.schemas.user import UserModel
from utils.manage_users import get_scoreboard

router = APIRouter()

@router.get("/", response_model=ScoreBoardOut)
async def get_score_board():
    score_board = get_scoreboard()
    score_board_list = [UserModel(username=u, score=s, difficulty=d) for u, s, d in score_board]
    return ScoreBoardOut(score_board=score_board_list)