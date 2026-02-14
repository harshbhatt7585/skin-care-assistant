// Mirrors backend/schema/chat.py for frontend payload parity.

export interface ChatMessage {
  role: string;
  content: string;
  timestamp: string; // ISO string
  content_type: string;
}

export interface StoreMessageRequest {
  chat_id: string;
  uid: string;
  messages: ChatMessage[];
}

export interface StoreMessageResponse {
  message: string;
}

export interface GetMessagesRequest {
  chat_id?: string | null;
  uid: string;
  timestamp: string;
}

export interface GetMessagesResponse {
  messages: ChatMessage[];
}
