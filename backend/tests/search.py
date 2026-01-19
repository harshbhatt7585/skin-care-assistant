from datetime import datetime, timezone

import pytest
from httpx import ASGITransport, AsyncClient

from app import app


@pytest.mark.asyncio
async def test_search_vector_db(monkeypatch):
    async def dummy_search(
        query: str, uid: str, timestamp: datetime, *, top_k: int = 20
    ):
        assert query == "What was my previous week analysis results?"
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

    monkeypatch.setattr("utils.search.search_vector_db", dummy_search)

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
