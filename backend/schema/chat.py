from pydantic import BaseModel, Field
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


class GetMessagesRequest(BaseModel):
    chat_id: str | None = None
    uid: str


class GetMessagesResponse(BaseModel):
    messages: list[ChatMessage]


# Chat Turn (single message exchange)
class ConversationTurnSchema(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class ChatTurnRequest(BaseModel):
    uid: str
    chat_id: str | None = None
    photo_data_urls: list[str] = Field(default_factory=list)
    history: list[ConversationTurnSchema] = Field(default_factory=list)
    message: str
    country: str = "us"


class ChatTurnResponse(BaseModel):
    reply: str
    history: list[ConversationTurnSchema]


# Initial Workflow (full scan analysis)
class WorkflowRequest(BaseModel):
    uid: str
    chat_id: str | None = None
    photo_data_urls: list[str]
    country: str = "us"


class WorkflowResponse(BaseModel):
    success: bool
    verification: str | None = None
    analysis: str | None = None
    ratings: str | None = None
    shopping: str | None = None
    history: list[ConversationTurnSchema]
    error: str | None = None
