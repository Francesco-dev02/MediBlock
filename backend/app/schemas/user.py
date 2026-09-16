from pydantic import BaseModel
from typing import Literal

class UserModel(BaseModel):
    username: str
    score: int
    difficulty: Literal["facile","difficile"]