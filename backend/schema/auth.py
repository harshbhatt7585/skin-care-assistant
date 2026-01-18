import datetime
from pydantic import BaseModel

class UserPersonal(BaseModel):
    email: str
    name: str
    uid: str
    gender: str
    country: str

class User(BaseModel):
    personal: UserPersonal
    skin_type: str
    last_scanned: datetime
    last_chat: datetime
    created_at: datetime