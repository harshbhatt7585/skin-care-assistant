const BASE_URL = import.meta.env.VITE_API_URL
import type {
  ChatMessage,
  StoreMessageRequest,
  StoreMessageResponse,
  ChatTurnRequest,
  ChatTurnResponse,
  WorkflowRequest,
  WorkflowResponse,
} from '../types/chats'

export async function getMessages(uid: string, chatId?: string): Promise<ChatMessage[]> {
  const params = new URLSearchParams({
    uid,
  })
  if (chatId) {
    params.set('chat_id', chatId)
  }

  const response = await fetch(`${BASE_URL}/chat/get-messages?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`)
  }
  const data = await response.json()
  return data.messages as ChatMessage[]
}

export async function storeMessage(payload: StoreMessageRequest): Promise<StoreMessageResponse> {
  const response = await fetch(`${BASE_URL}/chat/store-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to store messages: ${response.statusText}`)
  }

  return (await response.json()) as StoreMessageResponse
}

/**
 * Send a chat message and get AI response.
 * Messages are automatically persisted on the backend.
 */
export async function chatTurn(payload: ChatTurnRequest): Promise<ChatTurnResponse> {
  const response = await fetch(`${BASE_URL}/chat/turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Chat turn failed: ${response.statusText}`)
  }

  return (await response.json()) as ChatTurnResponse
}

/**
 * Run the full initial skincare analysis workflow.
 * Returns verification, analysis, ratings, and shopping recommendations.
 * Messages are automatically persisted on the backend.
 */
export async function runWorkflow(payload: WorkflowRequest): Promise<WorkflowResponse> {
  const response = await fetch(`${BASE_URL}/chat/workflow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Workflow failed: ${response.statusText}`)
  }

  return (await response.json()) as WorkflowResponse
}
