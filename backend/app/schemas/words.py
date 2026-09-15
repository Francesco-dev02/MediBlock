from pydantic import BaseModel


class WordsIn(BaseModel):
    words: list[str]
    target: str


class WordSimilarity(BaseModel):
    word: str
    score: float


class WordsOut(BaseModel):
    target: str
    similarities: list[WordSimilarity]
