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

// Conversation turn for chat
export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

// Chat Turn (single message exchange)
export interface ChatTurnRequest {
  uid: string;
  chat_id?: string | null;
  photo_data_urls: string[];
  history: ConversationTurn[];
  message: string;
  country: string;
}

export interface ChatTurnResponse {
  reply: string;
  history: ConversationTurn[];
}

// Initial Workflow (full scan analysis)
export interface WorkflowRequest {
  uid: string;
  chat_id?: string | null;
  photo_data_urls: string[];
  country: string;
}

export interface WorkflowResponse {
  success: boolean;
  verification?: string | null;
  analysis?: string | null;
  ratings?: string | null;
  shopping?: string | null;
  history: ConversationTurn[];
  error?: string | null;
}
