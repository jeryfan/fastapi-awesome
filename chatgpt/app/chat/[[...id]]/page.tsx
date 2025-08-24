"use client";
import ChatContent from "@/components/chat/chatContent";
import ChatHeader from "@/components/chat/chatHeader";
import ChatInput from "@/components/chat/chatInput";
import ChatSider from "@/components/chat/chatSider";
import { ChatContextProvider } from "@/context/chat-context";
import { useEffect, useRef, useState } from "react";

export function Chat() {
  const chatInputRef = useRef<HTMLDivElement>(null);
  const [chatInputHeight, setChatInputHeight] = useState(0);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setChatInputHeight(entries[0].target.clientHeight);
      }
    });

    if (chatInputRef.current) {
      observer.observe(chatInputRef.current);
    }

    return () => {
      if (chatInputRef.current) {
        observer.unobserve(chatInputRef.current);
      }
    };
  }, []);
  return (
    <div className="relative w-full h-full flex">
      <ChatSider />
      <div className="flex-1 flex flex-col relative">
        <ChatHeader />
        <div
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: `${chatInputHeight + 24}px` }}
        >
          <ChatContent />
        </div>
        <div className="" ref={chatInputRef}>
          <ChatInput />
        </div>
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
