from fastapi import APIRouter, HTTPException
from firebase_admin import auth

from database.firebase import init_firebase
from schema.auth import User, GetUser

auth_router = APIRouter(prefix="/auth", tags=["auth"])

db = init_firebase()


@auth_router.post("/register")
async def register(payload: User):
    doc_ref = db.collection("users").document(payload.personal.uid)
    if doc_ref.get().exists:
        raise HTTPException(status_code=409, detail="User already registered")

    try:
        auth.get_user(payload.personal.uid)
    except auth.UserNotFoundError:
        auth.create_user(
            uid=payload.personal.uid,
            email=payload.personal.email,
            display_name=payload.personal.name,
        )

    doc_ref.set(payload.model_dump())
    return {"uid": payload.personal.uid, "message": "User registered"}


@auth_router.post("/get-user")
async def get_user(payload: GetUser) -> User:
    uid = payload.uid
    doc_ref = db.collection("users").document(uid)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="User not found")

    user = doc_ref.get().to_dict()
    return User(**user)
