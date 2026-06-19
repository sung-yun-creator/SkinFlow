import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np

try:
    import faiss
except ImportError:  # pragma: no cover - depends on local optional package install
    faiss = None

try:
    from sentence_transformers import SentenceTransformer
except ImportError:  # pragma: no cover - depends on local optional package install
    SentenceTransformer = None


KNOWLEDGE_DIR = Path(__file__).resolve().parent / "knowledge"
CHUNKS_PATH = KNOWLEDGE_DIR / "knowledge_chunks.json"
EMBEDDINGS_PATH = KNOWLEDGE_DIR / "knowledge_embeddings.json"
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


class ChatbotSearchUnavailable(RuntimeError):
    pass


@lru_cache(maxsize=1)
def _load_search_index() -> dict[str, Any]:
    if faiss is None or SentenceTransformer is None:
        raise ChatbotSearchUnavailable(
            "Chatbot search dependencies are missing. Install sentence-transformers and faiss-cpu."
        )

    if not CHUNKS_PATH.exists() or not EMBEDDINGS_PATH.exists():
        raise ChatbotSearchUnavailable("Chatbot knowledge files are missing.")

    with CHUNKS_PATH.open("r", encoding="utf-8") as file:
        chunks = json.load(file)

    with EMBEDDINGS_PATH.open("r", encoding="utf-8") as file:
        embeddings = np.array(json.load(file), dtype="float32")

    if embeddings.ndim != 2 or len(chunks) != len(embeddings):
        raise ChatbotSearchUnavailable("Chatbot knowledge files are not aligned.")

    index = faiss.IndexFlatL2(embeddings.shape[1])
    index.add(embeddings)
    local_files_only = os.getenv("CHATBOT_MODEL_LOCAL_ONLY", "true").lower() != "false"
    model = SentenceTransformer(MODEL_NAME, local_files_only=local_files_only)

    return {
        "chunks": chunks,
        "embeddings": embeddings,
        "index": index,
        "model": model,
    }


def get_chatbot_search_status() -> dict[str, Any]:
    try:
        state = _load_search_index()
    except (ChatbotSearchUnavailable, Exception) as error:
        return {
            "status": "unavailable",
            "message": str(error),
            "chunk_count": 0,
            "embedding_count": 0,
        }

    return {
        "status": "ok",
        "message": "Chatbot knowledge search is ready.",
        "chunk_count": len(state["chunks"]),
        "embedding_count": len(state["embeddings"]),
    }


def search_chatbot_knowledge(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    try:
        state = _load_search_index()
    except Exception as error:
        raise ChatbotSearchUnavailable(str(error)) from error

    safe_top_k = max(1, min(int(top_k or 5), 10))
    query_embedding = state["model"].encode([query], convert_to_numpy=True).astype("float32")
    distances, indices = state["index"].search(query_embedding, k=safe_top_k)
    results = []

    for distance, index_value in zip(distances[0], indices[0]):
        if index_value < 0:
            continue

        chunk = state["chunks"][int(index_value)]
        results.append({
            "file": chunk.get("file"),
            "chunk_id": chunk.get("chunk_id"),
            "distance": float(distance),
            "text": chunk.get("text", ""),
        })

    return results
