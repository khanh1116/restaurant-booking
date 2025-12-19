// types/chatbot.ts

export type MessageRole = 'user' | 'bot';

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  type?: 'DB_QUERY' | 'FAQ' | 'UNKNOWN' | 'ERROR';
  confidence?: number;
};

export type ChatSession = {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

export type ChatContext = {
  restaurant_id?: number;
  user_id?: number;
  [key: string]: any;
};