from pydantic import BaseModel
from typing import Literal


class SessionStartIn(BaseModel):
    username: str
    difficulty: Literal["facile", "intermedio"]


class SessionStartOut(BaseModel):
    words: list[str]
