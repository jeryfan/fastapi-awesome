import { useChatContext } from "@/context/chat-context";
import { ChatMessage, type MessageContent } from "./chatCard";

const ChatContent = () => {
  const { messages } = useChatContext();
  return (
    <div className="overflow-auto h-full">
      {messages.map((msg, index) => (
        <ChatMessage
          key={index}
          role={msg.role as any}
          content={msg.content as MessageContent}
        />
      ))}
    </div>
  );
};

export default ChatContent;
