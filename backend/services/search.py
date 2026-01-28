from datetime import datetime, timezone
from typing import List

from llm.gemini import get_gemini_embedding
from utils.search import search_vector_db, upload_documents


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


def store_memory(
    uid: str,
    content: str,
    timestamp: datetime | None = None,
) -> None:
    """Persist a conversation snippet to the vector DB for later retrieval."""

    effective_timestamp = timestamp or datetime.now(timezone.utc)
    embedding = get_gemini_embedding(content, task_type="RETRIEVAL_DOCUMENT")
    upload_documents(uid, content, embedding, effective_timestamp)
