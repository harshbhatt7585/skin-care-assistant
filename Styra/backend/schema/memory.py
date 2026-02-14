from datetime import datetime
from typing import Any

from pydantic import BaseModel


class MemorySearchRequest(BaseModel):
    uid: str
    question: str
    timestamp: datetime | None = None


class MemorySearchResponse(BaseModel):
    result: dict[str, Any]
