"""Storing chat messages in the database endpoints."""

from fastapi import APIRouter

from database.firebase import init_firebase
from schema.chat import StoreMessageRequest, StoreMessageResponse

chat_router = APIRouter(prefix="/chat", tags=["chat"])
db = init_firebase()


@chat_router.post("/store-message")
async def store_message(payload: StoreMessageRequest) -> StoreMessageResponse:
    doc_ref = db.collection("chats").document(payload.chat_id)
    snapshot = doc_ref.get()
    if not snapshot.exists:
        seed_data = {"uid": payload.uid, "messages": []}
        doc_ref.set(seed_data)
        doc_data = seed_data
    else:
        doc_data = snapshot.to_dict() or {}
    existing_messages = doc_data.get("messages", [])
    new_messages = [message.model_dump() for message in payload.messages]

    doc_ref.update(
        {
            "uid": payload.uid,
            "messages": existing_messages + new_messages,
        }
    )

    return StoreMessageResponse(message="Message stored")
