// components/chat/ChatMessage.tsx
import React from 'react';
import type { ChatMessage as ChatMessageType } from '@/types/chatbot';

type Props = {
  message: ChatMessageType;
};

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  
  // Format timestamp
  const time = new Date(message.timestamp).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
            : 'bg-gradient-to-br from-gray-700 to-gray-800 text-gray-200'
        }`}
      >
        {isUser ? '👤' : '🤖'}
      </div>

      {/* Message bubble */}
      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-gray-800 text-gray-100 rounded-tl-sm'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>

        {/* Timestamp & confidence */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-gray-500">{time}</span>
          
          {!isUser && message.confidence !== undefined && (
            <span
              className={`text-xs font-medium ${
                message.confidence > 0.8
                  ? 'text-green-500'
                  : message.confidence > 0.5
                  ? 'text-yellow-500'
                  : 'text-red-500'
              }`}
            >
              {Math.round(message.confidence * 100)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}