from sentence_transformers import SentenceTransformer, util
from app.core.config import settings


class EmbeddingService:
    def __init__(self):
        self.model = SentenceTransformer(settings.embedding_model)

    def compute_similarity(self, words: list[str], target: str) -> list[float]:
        # Calcoliamo tutti gli embedding in un solo colpo: parole + target insieme,
        # più efficiente che chiamare encode() più volte separatamente.
        all_texts = words + [target]
        embeddings = self.model.encode(all_texts)

        word_embeddings = embeddings[:-1]   # tutti tranne l'ultimo
        target_embedding = embeddings[-1]   # solo l'ultimo (il target)

        # util.cos_sim calcola la similarità coseno tra due insiemi di vettori,
        # restituendo una matrice; qui è (n_parole x 1) perché il target è singolo.
        similarity_matrix = util.cos_sim(word_embeddings, target_embedding)

        # Appiattiamo la matrice in una lista semplice di numeri Python.
        return similarity_matrix.squeeze(-1).tolist()


embedding_service = EmbeddingService()
