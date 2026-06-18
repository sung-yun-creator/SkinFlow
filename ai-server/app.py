import json

import faiss
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI()

with open("knowledge_chunks.json", "r", encoding="utf-8") as f:
    chunks = json.load(f)

with open("knowledge_embeddings.json", "r", encoding="utf-8") as f:
    embeddings = np.array(json.load(f)).astype("float32")

model = SentenceTransformer(
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)

dimension = embeddings.shape[1]

index = faiss.IndexFlatL2(dimension)
index.add(embeddings)

print("FAISS 벡터 수:", index.ntotal)


class SearchRequest(BaseModel):
    query: str
    top_k: int = 3


@app.get("/")
def root():
    return {
        "success": True,
        "message": "SkinFlow FAISS search server is running",
        "chunk_count": len(chunks),
        "embedding_count": len(embeddings),
    }


@app.post("/search")
def search(req: SearchRequest):
    query_embedding = model.encode(
        [req.query],
        convert_to_numpy=True
    ).astype("float32")

    distances, indices = index.search(
        query_embedding,
        k=req.top_k
    )

    results = []

    for distance, idx in zip(distances[0], indices[0]):
        chunk = chunks[int(idx)]

        results.append({
            "file": chunk["file"],
            "chunk_id": chunk["chunk_id"],
            "distance": float(distance),
            "text": chunk["text"],
        })

    return {
        "success": True,
        "query": req.query,
        "results": results,
    }