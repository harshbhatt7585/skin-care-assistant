import json
import os
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional

import httpx
from openai import OpenAI

ToolHandler = Callable[[Dict[str, Any]], str]


def _require_env(var: str) -> str:
    value = os.environ.get(var)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {var}")
    return value


@dataclass
class ToolSpec:
    name: str
    description: str
    parameters: Dict[str, Any]
    handler: ToolHandler


def _safe_json_parse(value: str) -> Any:
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


class Agent:
    def __init__(
        self,
        *,
        system_prompt: str,
        model: str = "gpt-5-mini",
        max_turns: int = 6,
        photo_data_urls: Optional[List[str]] = None,
        tools: Optional[List[ToolSpec]] = None,
    ) -> None:
        api_key = _require_env("OPENAI_API_KEY")
        self.client = OpenAI(api_key=api_key)
        self.system_prompt = system_prompt
        self.model = model
        self.max_turns = max_turns
        self.photo_data_urls = photo_data_urls or []
        self.tool_map = {tool.name: tool for tool in (tools or [])}

    def _compile_messages(self, messages: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        compiled: List[Dict[str, Any]] = [
            {"role": "system", "content": self.system_prompt}
        ]
        if self.photo_data_urls:
            media_payload = [
                {
                    "type": "text",
                    "text": "Here are the bare-face scan images to analyze."
                    if len(self.photo_data_urls) > 1
                    else "Here is the bare-face scan image to analyze.",
                }
            ]
            media_payload.extend(
                {"type": "image_url", "image_url": {"url": url}}
                for url in self.photo_data_urls
            )
            compiled.append({"role": "user", "content": media_payload})
        for message in messages:
            compiled.append({"role": message["role"], "content": message["content"]})
        return compiled

    def respond(self, messages: List[Dict[str, str]]) -> str:
        compiled = self._compile_messages(messages)
        for _ in range(self.max_turns):
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=compiled,
                tools=[
                    {
                        "type": "function",
                        "function": {
                            "name": spec.name,
                            "description": spec.description,
                            "parameters": spec.parameters,
                        },
                    }
                    for spec in self.tool_map.values()
                ]
                or None,
                tool_choice="auto" if self.tool_map else None,
            )
            message = completion.choices[0].message
            tool_calls = message.tool_calls or []
            if tool_calls:
                compiled.append(
                    {
                        "role": "assistant",
                        "content": message.content or "",
                        "tool_calls": [
                            {
                                "id": call.id,
                                "type": call.type,
                                "function": {
                                    "name": call.function.name,
                                    "arguments": call.function.arguments,
                                },
                            }
                            for call in tool_calls
                        ],
                    }
                )
                for call in tool_calls:
                    func_call = call.function
                    tool = self.tool_map.get(func_call.name)
                    if not tool:
                        compiled.append(
                            {
                                "role": "tool",
                                "tool_call_id": call.id,
                                "content": f'Tool "{func_call.name}" is not available.',
                            }
                        )
                        continue
                    try:
                        args = _safe_json_parse(func_call.arguments or "{}")
                        if not isinstance(args, dict):
                            args = {"input": args}
                        result = tool.handler(args)
                    except Exception as exc:  # pylint: disable=broad-except
                        result = f'Tool "{func_call.name}" failed: {exc}'
                    compiled.append(
                        {
                            "role": "tool",
                            "tool_call_id": call.id,
                            "content": result,
                        }
                    )
                continue
            if message.content:
                return message.content
        raise RuntimeError("Agent exceeded max turns without producing a response.")


def create_serper_tool(gl: str) -> ToolSpec:
    api_key = _require_env("SERPER_API_KEY")

    def _handler(args: Dict[str, Any]) -> str:
        query = args.get("q")
        if not query:
            raise ValueError("Missing 'q' for serper tool call")
        response = httpx.post(
            "https://google.serper.dev/shopping",
            headers={
                "Content-Type": "application/json",
                "X-API-KEY": api_key,
            },
            json={"q": query, "gl": gl, "num": 20},
            timeout=30,
        )
        response.raise_for_status()
        payload = response.json()
        return json.dumps(payload.get("shopping"))

    return ToolSpec(
        name="serper",
        description="Fetch shopping search results for product recommendations.",
        parameters={
            "type": "object",
            "properties": {
                "q": {
                    "type": "string",
                    "description": "Search query describing the desired products",
                }
            },
            "required": ["q"],
            "additionalProperties": False,
        },
        handler=_handler,
    )


def create_cosmetist_agent(photo_data_urls: List[str], gl: str) -> Agent:
    return Agent(
        model="gpt-5-mini",
        max_turns=6,
        photo_data_urls=photo_data_urls,
        system_prompt=" ".join(
            [
                "You are a licensed aesthetician and cosmetic chemist.",
                "You name is Glowly, friendly and helpful.",
                "You can see the provided bare-face scan image via the companion user message. Never claim you cannot view it; describe what you observe and avoid asking for re-uploads.",
                "Chat naturally using markdown. When the user asks for products or shopping links, call the serper tool with a focused query and present the picks in markdown bullets.",
                'Whenever you recommend purchasable products, also append a ```json {"products": [...] } ``` code block whose objects include title, link, source/retailer, price (if known), and imageUrl so the UI can render the shopping cards.',
            ]
        ),
        tools=[create_serper_tool(gl)],
    )


def create_fashion_assistant_agent(
    gl: str, photo_data_urls: Optional[List[str]] = None
) -> Agent:
    return Agent(
        model="gpt-5-mini",
        max_turns=6,
        photo_data_urls=photo_data_urls or [],
        system_prompt=" ".join(
            [
                "You are Styra, an expert personal fashion stylist and shopping assistant.",
                "You help user to recommend and discover products that match their style, and body type",
                "Help users discover the best products across fashion, beauty, accessories, and footwear.",
                "You will help user to evaluate products one over the other to shop the best products for specific use case and event.",
                "You will not only toch the technical details of the products, but also the emotional preferences",
                "Be concise, practical, and conversational.",
                "don't use -- (dashes), be short and to the point"
                "If user intent is missing critical details, ask one short clarifying question before recommending.",
                "When recommending products or shopping links, always call the serper tool first.",
                "Never invent links, prices, or product details that are not from tool output.",
                "Present recommendations in markdown bullets and include brief reasons.",
                'Whenever you recommend purchasable products, append a ```json {"products": [...] } ``` code block.',
                "Each product object should include: title, source, link, price, imageUrl, rating, ratingCount, productId, and position when available.",
            ]
        ),
        tools=[create_serper_tool(gl)],
    )
