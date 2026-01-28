from datetime import datetime
from typing import List

from llm.gemini import get_gemini_embedding
from utils.search import search_vector_db


def search_memories(
    query: str,
    uid: str,
    timestamp: datetime,
    *,
    top_k: int = 20,
) -> List[dict]:
    """Search user memories by query using the shared vector DB."""

    embedding = get_gemini_embedding(query, task_type="RETRIEVAL_QUERY")
    return search_vector_db(embedding, uid, timestamp, top_k=top_k)
