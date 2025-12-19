// utils/chatStorage.ts
import type { ChatSession, ChatMessage } from '@/types/chatbot';

const STORAGE_KEY = 'chatbot_session';
const MAX_MESSAGES = 100; // Giới hạn số tin nhắn lưu

/**
 * Lấy session hiện tại từ localStorage
 */
export function getChatSession(): ChatSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const session = JSON.parse(stored) as ChatSession;
    return session;
  } catch (error) {
    console.error('Failed to load chat session:', error);
    return null;
  }
}

/**
 * Lưu session vào localStorage
 */
export function saveChatSession(session: ChatSession): void {
  try {
    // Giới hạn số tin nhắn
    if (session.messages.length > MAX_MESSAGES) {
      session.messages = session.messages.slice(-MAX_MESSAGES);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to save chat session:', error);
  }
}

/**
 * Tạo session mới
 */
export function createNewSession(): ChatSession {
  const session: ChatSession = {
    id: `session_${Date.now()}`,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  saveChatSession(session);
  return session;
}

/**
 * Thêm message vào session
 */
export function addMessage(message: ChatMessage): ChatSession {
  let session = getChatSession();
  
  if (!session) {
    session = createNewSession();
  }
  
  session.messages.push(message);
  session.updatedAt = Date.now();
  
  saveChatSession(session);
  return session;
}

/**
 * Xóa toàn bộ history
 */
export function clearChatHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear chat history:', error);
  }
}

/**
 * Tạo message ID unique
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}