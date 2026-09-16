from pydantic import BaseModel
from app.schemas.user import UserModel

class ScoreBoardOut(BaseModel):
    score_board: list[UserModel]