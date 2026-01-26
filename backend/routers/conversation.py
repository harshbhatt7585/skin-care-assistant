from fastapi import APIRouter

from agents.memory import search_agent
from schema.conversation import ConversationRequest, ConversationResponse


conversation_router = APIRouter(prefix="/conversation", tags=["conversation"])


@conversation_router.post("")
async def conversation_endpoint(
    payload: ConversationRequest,
) -> ConversationResponse:
    result = search_agent(
        payload.question,
        uid=payload.uid,
        timestamp=payload.timestamp,
    )
    return ConversationResponse(result=result)
