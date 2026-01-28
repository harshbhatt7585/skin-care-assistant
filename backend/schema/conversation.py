from typing import Any

from pydantic import BaseModel

from schema.chat import ChatMessage


class ConversationRequest(BaseModel):
    messages: list[ChatMessage]
    chat_id: str
    uid: str


class ConversationResponse(BaseModel):
    result: dict[str, Any]
