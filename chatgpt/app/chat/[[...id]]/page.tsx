"use client";
import ChatContent from "@/components/chat/chatContent";
import ChatHeader from "@/components/chat/chatHeader";
import ChatInput from "@/components/chat/chatInput";
import ChatSider from "@/components/chat/chatSider";
import { ChatContextProvider } from "@/context/chat-context";

export function Chat() {
  return (
    <div className="relative w-full h-full flex">
      <ChatSider />
      <div className="flex-1 flex flex-col relative">
        <ChatHeader />
        <ChatContent />
        <ChatInput />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ChatContextProvider>
      <Chat />
    </ChatContextProvider>
  );
}
