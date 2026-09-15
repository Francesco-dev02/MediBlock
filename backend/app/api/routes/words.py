from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool

from app.schemas.words import WordsIn, WordsOut, WordSimilarity
from app.services.embedding_service import embedding_service

router = APIRouter()


@router.post("/similarity", response_model=WordsOut)
async def compute_similarity(payload: WordsIn):
    scores = await run_in_threadpool(
        embedding_service.compute_similarity, payload.words, payload.target
    )
    similarities = [
        WordSimilarity(word=word, score=score)
        for word, score in zip(payload.words, scores)
    ]
    return WordsOut(target=payload.target, similarities=similarities)
