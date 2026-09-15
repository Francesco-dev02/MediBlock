from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import session, words

app = FastAPI(title="Word Game Backend")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],  # aggiorna con l'URL del tuo frontend
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

app.include_router(session.router, prefix="/session", tags=["session"])
app.include_router(words.router, prefix="/words", tags=["words"])


@app.get("/")
def root():
    return {"status": "ok", "message": "Word Game Backend attivo"}
