"""Storing chat messages in the database endpoints."""

from fastapi import APIRouter, Depends

from database.firebase import init_firebase
from schema.chat import (
    StoreMessageRequest,
    StoreMessageResponse,
    GetMessagesRequest,
    GetMessagesResponse,
)
from schema.memory import MemorySearchRequest, MemorySearchResponse

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


@chat_router.get("/get-messages")
async def get_messages(
    payload: GetMessagesRequest = Depends(),
) -> GetMessagesResponse:
    if payload.chat_id:
        snapshot = db.collection("chats").document(payload.chat_id).get()
    else:
        query = db.collection("chats").where("uid", "==", payload.uid).limit(1)
        results = list(query.stream())
        if not results:
            return GetMessagesResponse(messages=[])
        snapshot = results[0]

    if not snapshot.exists:
        return GetMessagesResponse(messages=[])

    doc_data = snapshot.to_dict() or {}
    messages = doc_data.get("messages", [])
    return GetMessagesResponse(messages=messages)


@chat_router.post("/memory-search")
async def memory_search(payload: MemorySearchRequest) -> MemorySearchResponse:
    from agents.memory import search_agent

    result = search_agent(
        payload.question,
        uid=payload.uid,
        timestamp=payload.timestamp,
    )
    return MemorySearchResponse(result=result)
