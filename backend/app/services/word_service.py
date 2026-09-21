import json
from pathlib import Path
import random
import numpy as np
from scipy.cluster.hierarchy import linkage, fcluster
from scipy.spatial.distance import pdist

from app.core.config import settings
from app.services.embedding_service import embedding_service


class WordService:
    def __init__(self):
        self._words = self._load_all_difficulties()
        self._embeddings = self._compute_embeddings()

    def _load_all_difficulties(self) -> dict[str, list[str]]:
        result = {}
        for difficulty in ["facile", "difficile"]:
            file_path = Path(settings.words_data_dir) / f"words_{difficulty}.json"
            with open(file_path, "r", encoding="utf-8") as f:
                result[difficulty] = json.load(f)
        return result

    def _compute_embeddings(self) -> dict[str, np.ndarray]:
        return {
            difficulty: embedding_service.model.encode(words)
            for difficulty, words in self._words.items()
        }

    def get_words(self, difficulty: str, username: str, n: int = 10) -> list[str]:
        pool = self._words[difficulty]
        embeddings = self._embeddings[difficulty]
        n = min(n, len(pool))
        if n == len(pool):
            return list(pool)

        cluster_labels = self._cluster(embeddings, n)
        return self._pick_random_per_cluster(pool, cluster_labels)

    def _cluster(self, embeddings: np.ndarray, n: int) -> np.ndarray:
        distances = pdist(embeddings, metric="cosine")
        tree = linkage(distances, method="average")
        return fcluster(tree, t=n, criterion="maxclust")

    def _pick_random_per_cluster(self, pool: list[str], cluster_labels: np.ndarray) -> list[str]:
        pool = list(pool) # a copy of pool is required to avoid self._words modification
        selected = []
        while len(pool) > 0:
            available_clusters = set(cluster_labels)
            for cluster_id in set(available_clusters):
                indices = [i for i, label in enumerate(cluster_labels) if label == cluster_id]
                if indices:
                    chosen_index = random.choice(indices)
                    selected.append(pool.pop(chosen_index))
                    cluster_labels = np.delete(cluster_labels, chosen_index)
        return selected


word_service = WordService()
