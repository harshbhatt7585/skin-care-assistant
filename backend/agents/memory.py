import json
import os
import re
from datetime import datetime, timezone
from typing import Dict, List

import requests
from dotenv import load_dotenv

from services.search import search_memories

load_dotenv()

MODEL_NAME = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-20b:free")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


class Tools:
    """Abstraction for tools that can be used in the agent."""

    def __init__(self, name: str, description: str, parameters: dict):
        self.name = name
        self.description = description
        self.parameters = parameters

    def __call__(self, **kwargs) -> dict:
        """Execute the tool with the given arguments."""
        raise NotImplementedError("Subclasses must implement this method.")


class RAGTool(Tools):
    """Tool for retrieving information from the memory index."""

    def __init__(
        self,
        *,
        uid: str,
        timestamp: datetime,
        default_k: int = 5,
    ) -> None:
        super().__init__(
            name="RAGTool",
            description="Retrieve information from the memory index.",
            parameters={"query": str, "k": int},
        )
        self.uid = uid
        self.timestamp = timestamp
        self.default_k = default_k

    def __call__(self, query: str, k: int = 5) -> list[dict]:
        """Retrieve information from the vector index."""
        top_k = k or self.default_k
        return retrieve_top_k_chunks(query, self.uid, self.timestamp, k=top_k)


def _get_api_key() -> str:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not set in the environment")
    return api_key


def _is_reasoning_model(model_name: str) -> bool:
    """Check if the model supports reasoning parameters."""
    reasoning_models = [
        "gpt-oss-120b",
        "gpt-oss-20b",
        "o3",
        "o4",
        "o1",
        "o3-mini",
        "o4-mini",
        "deepseek-r1",
    ]
    lowered = model_name.lower()
    return any(rm in lowered for rm in reasoning_models)


def _make_openrouter_request(
    messages: List[Dict[str, str]],
    model_name: str | None = None,
    temperature: float = 0.0,
    enable_reasoning: bool = False,
) -> str:
    """Make a request to OpenRouter API."""
    api_key = _get_api_key()
    target_model = model_name or MODEL_NAME

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/llm-memory",  # Optional, for OpenRouter rankings
    }

    # For free models, we need to allow data sharing
    # You can also set this globally at https://openrouter.ai/settings/privacy
    if ":free" in target_model:
        headers["X-Allow-Downstream-Training"] = "true"

    payload = {
        "model": target_model,
        "messages": messages,
        "temperature": temperature,
    }

    # Enable reasoning for supported models
    if enable_reasoning and _is_reasoning_model(target_model):
        payload["reasoning"] = {"enabled": True}

    response = requests.post(
        OPENROUTER_API_URL,
        headers=headers,
        json=payload,
        timeout=300,  # Longer timeout for reasoning models
    )

    if response.status_code != 200:
        raise RuntimeError(
            f"OpenRouter API error: {response.status_code} - {response.text}"
        )

    result = response.json()

    # Extract response content
    message = result["choices"][0]["message"]
    content = message.get("content", "").strip()

    # Check reasoning_details if content is empty (model put answer in reasoning)
    reasoning_details = message.get("reasoning_details")
    if reasoning_details:
        reasoning_text = ""
        if isinstance(reasoning_details, list):
            for item in reasoning_details:
                if isinstance(item, dict) and "text" in item:
                    reasoning_text += item["text"]
        elif isinstance(reasoning_details, str):
            reasoning_text = reasoning_details

        print(
            f"[Reasoning]: {reasoning_text[:500]}..."
            if len(reasoning_text) > 500
            else f"[Reasoning]: {reasoning_text}"
        )

        # If content is empty, try to extract JSON from reasoning
        if not content and reasoning_text:
            content = reasoning_text

    return content


def generate_response(
    prompt: str,
    system_instruction: str | None = None,
    model_name: str | None = None,
    temperature: float = 0.0,
) -> str:
    """Simple single-turn generation."""
    messages = []

    if system_instruction:
        messages.append({"role": "system", "content": system_instruction})

    messages.append({"role": "user", "content": prompt})

    return _make_openrouter_request(
        messages=messages,
        model_name=model_name,
        temperature=temperature,
    )


def generate_chat_completion(
    messages: List[Dict[str, str]],
    system_instruction: str | None = None,
    model_name: str | None = None,
    temperature: float = 0.0,
) -> str:
    """Multi-turn chat completion."""
    full_messages = []

    if system_instruction:
        full_messages.append({"role": "system", "content": system_instruction})

    full_messages.extend(messages)

    return _make_openrouter_request(
        messages=full_messages,
        model_name=model_name,
        temperature=temperature,
    )


def parse_agent_response(response: str) -> dict:
    """Parse JSON from LLM response, handling markdown code blocks."""

    # First, try direct JSON parsing
    try:
        return json.loads(response.strip())
    except (ValueError, json.JSONDecodeError):
        pass

    # Try to extract JSON from markdown code blocks (```json ... ``` or ``` ... ```)
    code_block_pattern = r"```(?:json)?\s*\n?([\s\S]*?)\n?```"
    matches = re.findall(code_block_pattern, response)

    for match in matches:
        try:
            return json.loads(match.strip())
        except (ValueError, json.JSONDecodeError):
            continue

    # Try to find raw JSON object in the response
    json_pattern = r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}"
    json_matches = re.findall(json_pattern, response)

    for match in json_matches:
        try:
            return json.loads(match)
        except (ValueError, json.JSONDecodeError):
            continue

    # Fallback: return empty result
    return {"found": False, "answer": "", "error": "Could not parse response"}


def retrieve_top_k_chunks(
    query: str,
    uid: str,
    timestamp: datetime,
    *,
    k: int = 5,
) -> List[dict]:
    """Retrieve top-k chunks using the shared search service."""

    results = search_memories(query, uid, timestamp, top_k=k)

    chunks: List[dict] = []
    for i, result in enumerate(results, start=1):
        entry = dict(result)
        entry.setdefault("rank", i)
        chunks.append(entry)

    return chunks


def query_generate_agent(question: str) -> str:
    system_prompt = (
        "You are a memory search agent. All conversation history lives in a vector DB, "
        "so you must iteratively craft retrieval queries until you can answer the user. "
        "Given a question like 'What did I order last night at the <restaurant_name> restaurant?', "
        "you should probe for 'restaurant', <restaurant_name>. Always respond with JSON in the "
        'form {"query": <query>, "context": <context>} describing the retrieval you need.'
    )

    messages = [
        {"role": "user", "content": f"Given Question: {question}"},
    ]

    response = generate_chat_completion(
        messages=messages,
        system_instruction=system_prompt,
    )
    parsed_response = parse_agent_response(response)
    return parsed_response.get("query", "")


def remember_agent(question: str) -> str:
    system_prompt = (
        "You are a memory remember agent, you are responsible for saving the particular details for the conversation in the vector db",
        "First understand the text and think weather it is worth rembering the details in the vector db",
        "Ask yourself, is there any details available in the text that is worth remembering?",
        "If yes, then save the details in the vector db",
        "If no, no need to save the details in the vector db",
        "Return the answer in the form of JSON: {'remember': true/false}",
    )

    messages = [
        {"role": "user", "content": f"Given Question: {question}"},
    ]
    response = generate_chat_completion(
        messages=messages,
        system_instruction=system_prompt,
    )
    parsed_response = parse_agent_response(response)
    return parsed_response.get("remember", "")


def search_agent(
    question: str,
    *,
    uid: str,
    timestamp: datetime | None = None,
    chunks: List[dict] | None = None,
) -> dict:
    timestamp = timestamp or datetime.now(timezone.utc)
    rag_tool = RAGTool(uid=uid, timestamp=timestamp)

    system_prompt = """You are a search agent. Your task is to find answers in conversation history using RAGTool.

IMPORTANT: You must respond with ONLY valid JSON. No explanations, no markdown, no extra text.

Available tool:
- RAGTool: Searches conversation history. Args: query (string), k (number of results)

Response format (choose ONE):

1. To search for more context:
{"tool": "RAGTool", "args": {"query": "your search query", "k": 5}}

2. When you found the answer:
{"found": true, "answer": "the specific answer"}

3. When answer cannot be found:
{"found": false, "answer": ""}

Rules:
- Output ONLY the JSON object, nothing else
- If context is empty or insufficient, use RAGTool to search
- Extract specific answers, not summaries
- Do not wrap JSON in markdown code blocks"""

    # Format context clearly
    if chunks:
        context_str = "\n".join(
            [
                f"[Chunk {c.get('rank', i + 1)}]: {c.get('text', c.get('content', str(c)))}"
                for i, c in enumerate((chunks or [])[:5])
            ]
        )
    else:
        context_str = "No context provided. Use RAGTool to search."

    user_content = f"""Context:
{context_str}

Question: {question}

Respond with JSON only:"""

    messages = [
        {"role": "user", "content": user_content},
    ]
    print("calling OpenRouter request")

    response = generate_chat_completion(
        messages=messages,
        system_instruction=system_prompt,
    )

    print("response: ", response)

    parsed_response = parse_agent_response(response)
    print("parsed_response: ", parsed_response)

    if parsed_response.get("tool") == "RAGTool":
        args = parsed_response.get("args")
        print("args: ", args)
        if args:
            print("calling RAGTool")
            desired_k = args.get("k") or 5
            chunk = rag_tool(args["query"], desired_k)
            print("chunk: ", chunk)
            return None

            # return search_agent(
            #     question,
            #     uid=uid,
            #     timestamp=timestamp,
            #     chunks=chunk,
            # )
        else:
            print("no args found")

    return parsed_response
