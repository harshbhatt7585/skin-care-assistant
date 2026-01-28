"""Chat endpoints for message storage and AI chat turns."""

from datetime import datetime

from fastapi import APIRouter, Depends

from database.firebase import init_firebase
from schema.chat import (
    StoreMessageRequest,
    StoreMessageResponse,
    GetMessagesRequest,
    GetMessagesResponse,
    ChatTurnRequest,
    ChatTurnResponse,
    WorkflowRequest,
    WorkflowResponse,
    ConversationTurnSchema,
)
from schema.memory import MemorySearchRequest, MemorySearchResponse
from schema.conversation import ConversationRequest, ConversationResponse
from agents.memory import search_agent

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


@chat_router.post("/conversation")
async def conversation_endpoint(
    payload: ConversationRequest,
) -> ConversationResponse:
    from agents.memory import search_agent

    result = search_agent(
        payload.question,
        uid=payload.uid,
        timestamp=payload.timestamp,
    )
    return ConversationResponse(result=result)


@chat_router.post("/turn")
async def chat_turn(payload: ChatTurnRequest) -> ChatTurnResponse:
    """
    Handle a single chat turn: receive user message, get AI response.
    Automatically persists both messages to Firebase.
    """
    from agents.cosmetist import run_chat_turn

    # Build history with the new user message
    history = [{"role": t.role, "content": t.content} for t in payload.history]
    history.append({"role": "user", "content": payload.message})

    memory = search_agent(
        payload.message,
        uid=payload.uid,
        timestamp=None,
    )

    # Get AI response
    reply = run_chat_turn(
        photo_data_urls=payload.photo_data_urls,
        history=history,
        country=payload.country,
        memory=memory,
    )

    # Add assistant response to history
    history.append({"role": "assistant", "content": reply})

    # Persist messages to Firebase
    chat_id = payload.chat_id or payload.uid
    if chat_id:
        _persist_messages(
            chat_id=chat_id,
            uid=payload.uid,
            messages=[
                {"role": "user", "content": payload.message},
                {"role": "assistant", "content": reply},
            ],
        )

    return ChatTurnResponse(
        reply=reply,
        history=[
            ConversationTurnSchema(role=t["role"], content=t["content"])
            for t in history
        ],
    )


@chat_router.post("/workflow")
async def run_workflow(payload: WorkflowRequest) -> WorkflowResponse:
    """
    Run the full initial skincare analysis workflow.
    Returns verification, analysis, ratings, and shopping recommendations.
    """
    from agents.cosmetist import run_initial_workflow

    try:
        result = run_initial_workflow(
            photo_data_urls=payload.photo_data_urls,
            country=payload.country,
        )

        # Check if verification failed
        verification = result.get("verification", "")
        success = True
        error = None

        try:
            import json

            v_json = json.loads(verification)
            if not v_json.get("success"):
                success = False
                error = v_json.get("message", "Image verification failed")
        except (json.JSONDecodeError, TypeError):
            pass

        # Persist all messages to Firebase
        chat_id = payload.chat_id or payload.uid
        if chat_id and result.get("history"):
            _persist_messages(
                chat_id=chat_id,
                uid=payload.uid,
                messages=result["history"],
            )

        return WorkflowResponse(
            success=success,
            verification=result.get("verification"),
            analysis=result.get("analysis"),
            ratings=result.get("ratings"),
            shopping=result.get("shopping"),
            history=[
                ConversationTurnSchema(role=t["role"], content=t["content"])
                for t in result.get("history", [])
            ],
            error=error,
        )
    except Exception as e:
        return WorkflowResponse(
            success=False,
            history=[],
            error=str(e),
        )


def _persist_messages(chat_id: str, uid: str, messages: list[dict]) -> None:
    """Helper to persist messages to Firebase."""
    doc_ref = db.collection("chats").document(chat_id)
    snapshot = doc_ref.get()

    if not snapshot.exists:
        doc_ref.set({"uid": uid, "messages": []})
        existing_messages = []
    else:
        doc_data = snapshot.to_dict() or {}
        existing_messages = doc_data.get("messages", [])

    new_messages = [
        {
            "role": m["role"],
            "content": m["content"],
            "timestamp": datetime.now().isoformat(),
            "content_type": "text",
        }
        for m in messages
    ]

    doc_ref.update(
        {
            "uid": uid,
            "messages": existing_messages + new_messages,
        }
    )
