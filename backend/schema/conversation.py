from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ConversationRequest(BaseModel):
    uid: str
    question: str
    timestamp: datetime | None = None


class ConversationResponse(BaseModel):
    result: dict[str, Any]
