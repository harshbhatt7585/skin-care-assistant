# Build the Azure Search Vector DB schema

import os
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any

from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    HnswAlgorithmConfiguration,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    SearchIndex,
    SimpleField,
    VectorSearch,
    VectorSearchProfile,
)
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env"

if ENV_PATH.exists():
    load_dotenv(ENV_PATH)


INDEX_NAME = "glowly-memory"
EMBEDDING_DIMENSIONS = 1536


@lru_cache(maxsize=1)
def get_azure_search_config() -> tuple[str, str]:
    endpoint = os.environ.get("AZURE_SEARCH_ENDPOINT")
    api_key = os.environ.get("AZURE_SEARCH_API_KEY")

    if not endpoint or not api_key:
        raise RuntimeError(
            "Set AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_API_KEY environment variables"
        )

    return endpoint, api_key


def get_index_client() -> SearchIndexClient:
    endpoint, api_key = get_azure_search_config()
    return SearchIndexClient(endpoint=endpoint, credential=AzureKeyCredential(api_key))


def create_index_schema() -> SearchIndex:
    vector_search = VectorSearch(
        algorithms=[
            HnswAlgorithmConfiguration(
                name="hnsw-config",
                parameters={
                    "m": 4,
                    "efConstruction": 400,
                    "efSearch": 500,
                    "metric": "cosine",
                },
            ),
        ],
        profiles=[
            VectorSearchProfile(
                name="vector-profile",
                algorithm_configuration_name="hnsw-config",
            ),
        ],
    )

    fields = [
        SimpleField(
            name="id",
            type=SearchFieldDataType.String,
            key=True,
            filterable=True,
        ),
        SimpleField(
            name="uid",
            type=SearchFieldDataType.String,
            filterable=True,
            facetable=True,
        ),
        SimpleField(
            name="timestamp",
            type=SearchFieldDataType.DateTimeOffset,
            filterable=True,
            sortable=True,
        ),
        SearchableField(
            name="content",
            type=SearchFieldDataType.String,
            analyzer_name="en.microsoft",
        ),
        SearchField(
            name="embedding",
            type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
            searchable=True,
            vector_search_dimensions=EMBEDDING_DIMENSIONS,
            vector_search_profile_name="vector-profile",
        ),
    ]

    return SearchIndex(
        name=INDEX_NAME,
        fields=fields,
        vector_search=vector_search,
    )


def build_index(recreate: bool = False) -> SearchIndex:
    client = get_index_client()

    existing_indexes = [idx.name for idx in client.list_indexes()]

    if INDEX_NAME in existing_indexes:
        if recreate:
            print(f"Deleting existing index: {INDEX_NAME}")
            client.delete_index(INDEX_NAME)
        else:
            print(f"Index '{INDEX_NAME}' already exists. Use recreate=True to rebuild.")
            return client.get_index(INDEX_NAME)

    index_schema = create_index_schema()
    print(f"Creating index: {INDEX_NAME}")
    result = client.create_index(index_schema)
    print(f"Index '{result.name}' created successfully!")

    return result


def create_memory_document(
    uid: str,
    content: str,
    embedding: list[float],
    timestamp: datetime | None = None,
) -> dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "uid": uid,
        "timestamp": (timestamp or datetime.now(timezone.utc)).isoformat(),
        "content": content,
        "embedding": embedding,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Build Azure Search Vector DB for Glowly"
    )
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Delete and recreate the index if it exists",
    )
    args = parser.parse_args()

    index = build_index(recreate=args.recreate)
    print("\nIndex configuration:")
    print(f"  Name: {index.name}")
    print(f"  Fields: {len(index.fields)}")
