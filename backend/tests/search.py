from datetime import datetime, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from app import app


@pytest.mark.asyncio
async def test_search_vector_db(monkeypatch):
    def dummy_search(query: str, uid: str, timestamp: datetime, *, top_k: int = 20):
        assert query == "what was my previous week analysis results?"
        assert uid == "user-123"
        assert timestamp == datetime(2024, 1, 1, tzinfo=timezone.utc)

        return [
            {
                "id": "mem-1",
                "uid": uid,
                "timestamp": timestamp.isoformat(),
                "content": "Remember to recommend hydrating toner",
            }
        ]

    monkeypatch.setattr("services.search.search_memories", dummy_search)

    payload = {
        "query": "hydrating toner",
        "uid": "user-123",
        "timestamp": "2024-01-01T00:00:00Z",
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/search/search-vector-db", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "results": [
            {
                "id": "mem-1",
                "uid": "user-123",
                "timestamp": "2024-01-01T00:00:00+00:00",
                "content": "Remember to recommend hydrating toner",
            }
        ]
    }


@pytest.mark.asyncio
async def test_upload_vector_db(monkeypatch):
    def dummy_upload(
        uid: str, content: str, embedding: list[float], timestamp: datetime
    ):
        assert uid == "user-123"
        assert (
            content
            == "User: I have dry skin and I want to know the best moisturizer for my skin. Assistant: I recommend you to use the moisturizer that is best for your skin."
        )
        assert len(embedding) == 1536
        assert timestamp == datetime(2024, 1, 1, tzinfo=timezone.utc)
        return "Documents uploaded"

    monkeypatch.setattr(
        "routers.search.get_gemini_embedding", lambda content: [0.1] * 1536
    )
    monkeypatch.setattr("routers.search.upload_documents_util", dummy_upload)
    payload = {
        "uid": "user-123",
        "content": "Remember to recommend hydrating toner",
        "embedding": [0.1] * 1536,
        "timestamp": "2024-01-01T00:00:00Z",
    }

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post("/search/upload-vector-db", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body == {"message": "Documents uploaded"}
