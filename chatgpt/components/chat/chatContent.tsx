import { useChatContext } from "@/context/chat-context";
import { ChatMessage, type MessageContent } from "./chatCard";
import { useEffect, useRef } from "react";
import { AlertCircle, X } from "lucide-react";

const ChatContent = () => {
  const {
    messages,
    isRequesting,
    retryMessage,
    deleteMessage,
    lastError,
    clearError,
  } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="overflow-auto h-full px-4 py-2 relative">
      {/* 全局错误提示 */}
      {lastError && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2 shadow-lg">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{lastError}</span>
          <button
            onClick={clearError}
            className="ml-2 text-red-500 hover:text-red-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">开始新的对话</h3>
            <p className="text-sm">
              输入消息、上传文件或使用语音输入来开始聊天
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((msg, index) => (
            <ChatMessage
              key={msg.id || index}
              role={msg.role as "user" | "assistant" | "system"}
              content={msg.content as MessageContent}
              isStreaming={
                isRequesting &&
                index === messages.length - 1 &&
                msg.role === "assistant"
              }
              status={msg.status}
              error={msg.error}
              messageId={msg.id}
              onRetry={retryMessage}
              onDelete={deleteMessage}
            />
          ))}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
};

export default ChatContent;
