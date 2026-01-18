from datetime import datetime
from pydantic import BaseModel


class UserPersonal(BaseModel):
    email: str
    name: str
    uid: str
    gender: str
    country: str


class User(BaseModel):
    personal: UserPersonal
    last_scanned: datetime
    last_chat: datetime
    created_at: datetime


class GetUser(BaseModel):
    uid: str
