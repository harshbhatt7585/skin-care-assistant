"""Cosmetist chat agent for skincare analysis and recommendations."""

import json
import os
from typing import Any

import requests
from dotenv import load_dotenv


load_dotenv("../../.env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"
SERPER_API_KEY = os.getenv("SERPER_API_KEY")
DEFAULT_MODEL = "gpt-4o-mini"

COSMETIST_SYSTEM_PROMPT = """You are a licensed aesthetician and cosmetic chemist.
You can see the provided bare-face scan image via the companion user message. Never claim you cannot view it; describe what you observe and avoid asking for re-uploads.
Chat naturally using markdown. When the user asks for products or shopping links, call the serper tool with a focused query and return your reply with markdown bullets that include links and thumbnails."""


class ConversationTurn:
    """Represents a single turn in the conversation."""

    def __init__(self, role: str, content: str):
        self.role = role
        self.content = content

    def to_dict(self) -> dict:
        return {"role": self.role, "content": self.content}


def _get_openai_key() -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set in the environment")
    return OPENAI_API_KEY


def _serper_shopping_search(query: str, gl: str = "us") -> str:
    """Execute a shopping search using Serper API."""
    if not SERPER_API_KEY:
        raise RuntimeError("SERPER_API_KEY is not set in the environment")

    response = requests.post(
        "https://google.serper.dev/shopping",
        headers={
            "Content-Type": "application/json",
            "X-API-KEY": SERPER_API_KEY,
        },
        json={"q": query, "gl": gl, "num": 20},
        timeout=30,
    )

    if response.status_code != 200:
        raise RuntimeError(f"Serper search failed ({response.status_code})")

    payload = response.json()
    return json.dumps(payload.get("shopping", []))


SERPER_TOOL = {
    "type": "function",
    "function": {
        "name": "serper",
        "description": "Fetch shopping search results for skincare recommendations.",
        "parameters": {
            "type": "object",
            "properties": {
                "q": {
                    "type": "string",
                    "description": "Search query describing the desired products",
                },
            },
            "required": ["q"],
            "additionalProperties": False,
        },
    },
}


def _make_openai_request(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    tools: list[dict] | None = None,
    max_turns: int = 6,
    country: str = "us",
) -> str:
    """Make a request to OpenAI API with tool support."""
    api_key = _get_openai_key()

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    for turn in range(max_turns):
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
        }

        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        response = requests.post(
            OPENAI_API_URL,
            headers=headers,
            json=payload,
            timeout=120,
        )

        if response.status_code != 200:
            raise RuntimeError(
                f"OpenAI API error: {response.status_code} - {response.text}"
            )

        result = response.json()
        choice = result["choices"][0]
        message = choice["message"]

        tool_calls = message.get("tool_calls", [])

        if tool_calls:
            # Add assistant message with tool calls
            messages.append(
                {
                    "role": "assistant",
                    "content": message.get("content") or "",
                    "tool_calls": tool_calls,
                }
            )

            # Execute each tool call
            for tool_call in tool_calls:
                func = tool_call.get("function", {})
                func_name = func.get("name", "")
                func_args = json.loads(func.get("arguments", "{}"))

                if func_name == "serper":
                    try:
                        tool_result = _serper_shopping_search(
                            func_args.get("q", ""), gl=country
                        )
                    except Exception as e:
                        tool_result = f"Tool error: {str(e)}"
                else:
                    tool_result = f'Tool "{func_name}" is not available.'

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": tool_result,
                    }
                )

            continue

        # No tool calls, return the content
        if message.get("content"):
            return message["content"]

    raise RuntimeError("Agent exceeded max turns without producing a response.")


def run_chat_turn(
    photo_data_urls: list[str],
    history: list[dict],
    country: str = "us",
) -> str:
    """
    Run a single chat turn with the cosmetist agent.

    Args:
        photo_data_urls: List of base64 image data URLs
        history: Conversation history as list of {role, content} dicts
        country: Country code for shopping searches

    Returns:
        The assistant's response
    """
    messages: list[dict] = [{"role": "system", "content": COSMETIST_SYSTEM_PROMPT}]

    # Add photo context if provided
    if photo_data_urls:
        text = (
            "Here are the bare-face scan images to analyze."
            if len(photo_data_urls) > 1
            else "Here is the bare-face scan image to analyze."
        )
        messages.append(
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": text},
                    *[
                        {"type": "image_url", "image_url": {"url": url}}
                        for url in photo_data_urls
                    ],
                ],
            }
        )

    # Add conversation history
    for turn in history:
        messages.append({"role": turn["role"], "content": turn["content"]})

    return _make_openai_request(
        messages=messages,
        tools=[SERPER_TOOL],
        country=country,
    )


def run_initial_workflow(
    photo_data_urls: list[str],
    country: str = "us",
) -> dict[str, Any]:
    """
    Run the initial skincare analysis workflow.

    Returns:
        Dict with keys: verification, analysis, ratings, shopping, history
    """
    if not photo_data_urls:
        raise ValueError("At least one photo is required")

    history: list[dict] = []
    results: dict[str, Any] = {
        "verification": None,
        "analysis": None,
        "ratings": None,
        "shopping": None,
        "history": [],
    }

    def prompt_and_respond(content: str) -> str:
        history.append({"role": "user", "content": content})
        reply = run_chat_turn(photo_data_urls, history, country)
        history.append({"role": "assistant", "content": reply})
        return reply

    # Step 1: Verify images
    verification_prompt = (
        "Here are 3 images of human face. requires images to be front face, left side face, "
        "and right side face. If you find that the required images are not present, give negative "
        "response and ask tell the user what they are missing in simple and less words. "
        "give response in json like {success: false/true, message: '...'}"
    )
    verification_reply = prompt_and_respond(verification_prompt)
    results["verification"] = verification_reply

    try:
        verification_json = json.loads(verification_reply)
        if not verification_json.get("success"):
            results["history"] = history
            return results
    except json.JSONDecodeError:
        pass  # Continue anyway if parsing fails

    # Step 2: Analyze skin
    analysis_prompt = (
        "Please analyze my bare-face photo. List bullet-point concerns (acne, pigmentation, "
        "redness, wrinkles, etc.) and rate Hydration, Oil Balance, Tone, Barrier Strength, "
        "and Sensitivity on a 1–5 scale. Keep it concise."
    )
    results["analysis"] = prompt_and_respond(analysis_prompt)

    # Step 3: Get ratings JSON
    ratings_prompt = (
        "From that analysis, output a JSON object with keys hydration, oilBalance, tone, "
        "barrierStrength, sensitivity (numbers 1-5). No prose."
    )
    results["ratings"] = prompt_and_respond(ratings_prompt)

    # Step 4: Get shopping recommendations
    shopping_prompt = (
        "Using that assessment, fetch current shopping options with links and thumbnails "
        "for the AM/PM plan. Use tools if needed and return markdown with inline product cards. "
        'Format the response in this format: ```json\n{\n  "products": [\n    {\n      '
        '"title": "Example Product Title",\n      "source": "ExampleSource.com",\n      '
        '"link": "https://example.com/product-page",\n      "price": "$0.00",\n      '
        '"imageUrl": "https://example.com/product-image.jpg",\n      "rating": 0,\n      '
        '"ratingCount": 0,\n      "productId": "123456789",\n      "position": 1\n    }\n  ]\n}\n```'
    )
    results["shopping"] = prompt_and_respond(shopping_prompt)

    results["history"] = history
    return results
