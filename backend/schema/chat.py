from pydantic import BaseModel
from datetime import datetime


class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime
    content_type: str


class StoreMessageRequest(BaseModel):
    chat_id: str
    uid: str
    messages: list[ChatMessage]


class StoreMessageResponse(BaseModel):
    message: str
