from pydantic import BaseModel
from datetime import datetime


class SearchVectorDBRequest(BaseModel):
    query: str
    uid: str
    timestamp: datetime


class SearchVectorDBResponse(BaseModel):
    results: list[dict]


class UploadVectorDBRequest(BaseModel):
    uid: str
    content: str
    embedding: list[float]
    timestamp: datetime


class UploadVectorDBResponse(BaseModel):
    message: str
