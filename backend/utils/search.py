import os
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from dotenv import load_dotenv
from uuid import uuid4


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env"

if ENV_PATH.exists():
    load_dotenv(ENV_PATH)


INDEX_NAME = os.environ.get("AZURE_SEARCH_INDEX", "glowly-memory")


@lru_cache(maxsize=1)
def get_search_client() -> SearchClient:
    endpoint = os.environ.get("AZURE_SEARCH_ENDPOINT")
    api_key = os.environ.get("AZURE_SEARCH_API_KEY")

    if not endpoint or not api_key:
        raise RuntimeError(
            "Set AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_API_KEY environment variables"
        )

    return SearchClient(
        endpoint=endpoint,
        index_name=INDEX_NAME,
        credential=AzureKeyCredential(api_key),
    )


def _escape_filter_value(value: str) -> str:
    return value.replace("'", "''")


def _format_timestamp(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    value = value.astimezone(timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


def search_vector_db(
    query: str,
    uid: str,
    timestamp: datetime,
    *,
    top_k: int = 20,
) -> list[dict[str, Any]]:
    client = get_search_client()

    filters = [f"uid eq '{_escape_filter_value(uid)}'"]
    filters.append(f"timestamp le {_format_timestamp(timestamp)}")
    filter_expr = " and ".join(filters)

    search_text = query.strip()
    if not search_text:
        search_text = "*"

    results = client.search(
        search_text=search_text,
        filter=filter_expr,
        top=top_k,
        order_by=["timestamp desc"],
        select=["id", "uid", "timestamp", "content"],
    )

    payload = []
    for result in results:
        data = dict(result)
        ts = data.get("timestamp")
        if isinstance(ts, datetime):
            data["timestamp"] = ts.isoformat()
        payload.append(data)

    return payload


def upload_documents(
    uid: str,
    content: str,
    embedding: list[float],
    timestamp: datetime,
) -> str:
    client = get_search_client()
    client.upload_documents(
        documents=[
            {
                "id": str(uuid4()),
                "uid": uid,
                "timestamp": timestamp.isoformat(),
                "content": content,
                "embedding": embedding,
            }
        ]
    )
    return "Documents uploaded"
