from pydantic import BaseModel
from typing import Literal


class SessionStartIn(BaseModel):
    username: str
    difficulty: Literal["facile", "difficile"]


class SessionStartOut(BaseModel):
    words: list[str]

class SessionEndIn(BaseModel):
    score: int

class SessionEndOut(BaseModel):
    top_scorer: list[tuple[str, int]]
