from typing import Any, Literal

from pydantic import BaseModel, Field


class ConversationTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ScanWorkflowRequest(BaseModel):
    photo_data_urls: list[str] = Field(..., min_length=1)
    country: str | None = None


class ScanChatTurnRequest(BaseModel):
    photo_data_urls: list[str] = Field(default_factory=list)
    country: str
    history: list[ConversationTurn]


class ScanChatTurnResponse(BaseModel):
    reply: str
    history: list[ConversationTurn]


class WorkflowEvent(BaseModel):
    step: str
    status: Literal["in_progress", "completed", "failed", "succeeded"]
    message: str | None = None
    analysis: str | None = None
    ratings: str | None = None
    shopping: str | None = None
    error: str | None = None
    history: list[ConversationTurn] | None = None


class GetScanRequest(BaseModel):
    scan_id: str


class GetScanResponse(BaseModel):
    scan: dict[str, Any]


class GetUserScansRequest(BaseModel):
    uid: str


class GetUserScansResponse(BaseModel):
    scans: list[dict[str, Any]]


class DeleteScanRequest(BaseModel):
    scan_id: str


class DeleteScanResponse(BaseModel):
    success: bool
