const BASE_URL = import.meta.env.VITE_API_URL
import type { ChatMessage } from '../types/chats'

export async function getMessages(uid: string, chatId?: string): Promise<ChatMessage[]> {
  const response = await fetch(`${BASE_URL}/chat/get-messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid,
      chat_id: chatId ?? null,
      timestamp: new Date().toISOString(),
    }),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.statusText}`)
  }
  const data = await response.json()
  return data.messages as ChatMessage[]
}
