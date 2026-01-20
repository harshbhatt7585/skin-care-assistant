from datetime import datetime
from pydantic import BaseModel


class UserPersonal(BaseModel):
    email: str
    name: str
    uid: str
    gender: str | None = None
    country: str | None = None


class User(BaseModel):
    personal: UserPersonal
    last_scanned: datetime | None = None
    last_chat: datetime | None = None
    created_at: datetime


class GetUser(BaseModel):
    uid: str
