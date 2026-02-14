import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env"

if ENV_PATH.exists():
    load_dotenv(ENV_PATH)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
EMBEDDING_MODEL = "gemini-embedding-001"
DEFAULT_DIMENSIONS = 768  # Available options: 768, 1536, or 3072


@lru_cache(maxsize=1)
def _get_client() -> genai.Client:
    if not GEMINI_API_KEY:
        raise RuntimeError("Set the GEMINI_API_KEY environment variable")
    return genai.Client(api_key=GEMINI_API_KEY)


def get_gemini_embedding(
    text: str,
    task_type: str = "RETRIEVAL_DOCUMENT",
    output_dimensionality: int = DEFAULT_DIMENSIONS,
) -> list[float]:
    text = text.strip()
    if not text:
        raise ValueError("Text must be a non-empty string")

    client = _get_client()

    try:
        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=output_dimensionality,
            ),
        )
    except Exception as exc:
        raise RuntimeError("Gemini embedding request failed") from exc

    if not response.embeddings:
        raise RuntimeError("Gemini API did not return an embedding vector")

    embedding = response.embeddings[0].values

    # Normalize for dimensions other than 3072
    if output_dimensionality != 3072:
        import numpy as np

        embedding = np.array(embedding)
        embedding = embedding / np.linalg.norm(embedding)
        return embedding.tolist()

    return list(embedding)


if __name__ == "__main__":
    print(len(get_gemini_embedding("Hello, world!")))
