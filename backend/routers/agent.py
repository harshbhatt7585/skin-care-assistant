import asyncio
import json
from typing import AsyncGenerator, List

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from agents.cosmetist import create_cosmetist_agent
from schema.scan import (
    ConversationTurn,
    ScanChatTurnRequest,
    ScanChatTurnResponse,
    ScanWorkflowRequest,
)

agent_router = APIRouter(prefix="/agent", tags=["agent"])


async def _agent_prompt(agent, history: List[dict], content: str):
    history.append({"role": "user", "content": content})
    reply = await asyncio.to_thread(agent.respond, history.copy())
    history.append({"role": "assistant", "content": reply})
    return reply, list(history)


def _serialize_event(payload: dict) -> bytes:
    return f"data: {json.dumps(payload)}\n\n".encode("utf-8")


@agent_router.post("/workflow")
async def run_workflow(payload: ScanWorkflowRequest) -> StreamingResponse:
    agent = create_cosmetist_agent(
        payload.photo_data_urls, (payload.country or "us").lower()
    )
    history: List[dict] = []

    async def event_stream() -> AsyncGenerator[bytes, None]:
        try:
            yield _serialize_event({"step": "verifying", "status": "in_progress"})
            verify_prompt = (
                "Here are 3 images of human face. requires images to be front face, left side face, and right side face. "
                "If you find that the required images are not present, give negative response and tell the user what they are missing "
                "in simple and fewer words. give response in json like {success: false/true, message: '...'}"
            )
            verify_reply, verify_history = await _agent_prompt(
                agent, history, verify_prompt
            )
            try:
                verify_json = json.loads(verify_reply)
            except json.JSONDecodeError:
                yield _serialize_event(
                    {
                        "step": "verifying",
                        "status": "failed",
                        "message": "Verification response was not valid JSON.",
                    }
                )
                return
            if not verify_json.get("success"):
                yield _serialize_event(
                    {
                        "step": "verifying",
                        "status": "failed",
                        "message": verify_json.get(
                            "message", "Missing required angles."
                        ),
                    }
                )
                return
            yield _serialize_event(
                {
                    "step": "verifying",
                    "status": "completed",
                    "message": verify_json.get(
                        "message", "All required views detected."
                    ),
                    "history": verify_history,
                }
            )

            yield _serialize_event({"step": "scanning", "status": "in_progress"})
            analysis_prompt = "Please analyze my bare-face photo. List bullet-point concerns (acne, pigmentation, redness, wrinkles, etc.) and rate Hydration, Oil Balance, Tone, Barrier Strength, and Sensitivity on a 1–5 scale. Keep it concise."
            analysis_reply, analysis_history = await _agent_prompt(
                agent, history, analysis_prompt
            )
            yield _serialize_event(
                {
                    "step": "scanning",
                    "status": "completed",
                    "analysis": analysis_reply,
                    "history": analysis_history,
                }
            )

            yield _serialize_event({"step": "analyzing", "status": "in_progress"})
            ratings_prompt = "From that analysis, output a JSON object with keys hydration, oilBalance, tone, barrierStrength, sensitivity (numbers 1-5). No prose."
            ratings_reply, ratings_history = await _agent_prompt(
                agent, history, ratings_prompt
            )
            yield _serialize_event(
                {
                    "step": "analyzing",
                    "status": "completed",
                    "ratings": ratings_reply,
                    "history": ratings_history,
                }
            )

            yield _serialize_event({"step": "shopping", "status": "in_progress"})
            shopping_prompt = 'Using that assessment, fetch current shopping options with links and thumbnails for the AM/PM plan. Use tools if needed and return markdown with inline product cards. Format the response in this format: ```json\\n{\\n  "products": [\\n    {\\n      "title": "Example Product Title",\\n      "source": "ExampleSource.com",\\n      "link": "https://example.com/product-page",\\n      "price": "$0.00",\\n      "imageUrl": "https://example.com/product-image.jpg",\\n      "rating": 0,\\n      "ratingCount": 0,\\n      "productId": "123456789",\\n      "position": 1\\n    }\\n  ]\\n}\\n```'
            shopping_reply, shopping_history = await _agent_prompt(
                agent, history, shopping_prompt
            )
            yield _serialize_event(
                {
                    "step": "shopping",
                    "status": "completed",
                    "shopping": shopping_reply,
                    "history": shopping_history,
                }
            )

            yield _serialize_event(
                {
                    "step": "complete",
                    "status": "succeeded",
                    "history": shopping_history,
                }
            )
        except Exception as exc:  # pylint: disable=broad-except
            yield _serialize_event(
                {
                    "step": "error",
                    "status": "failed",
                    "error": str(exc),
                }
            )

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@agent_router.post("/chat-turn", response_model=ScanChatTurnResponse)
async def run_chat_turn(payload: ScanChatTurnRequest) -> ScanChatTurnResponse:
    agent = create_cosmetist_agent(payload.photo_data_urls, payload.country.lower())
    reply = await asyncio.to_thread(
        agent.respond, [message.model_dump() for message in payload.history]
    )
    updated_history = payload.history + [
        ConversationTurn(role="assistant", content=reply)
    ]
    return ScanChatTurnResponse(reply=reply, history=updated_history)
