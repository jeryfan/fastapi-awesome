import ChatSider from "@/components/chat/chatSider";
import { ChatContextProvider } from "@/context/chat-context";
import { FC } from "react";
interface IChatProps {}

export function Chat(props: IChatProps) {
  return (
    <div className="w-full h-full">
      <ChatSider />
    </div>
  );
}

export default function ChatPage(props: IChatProps) {
  return (
    <ChatContextProvider>
      <Chat {...props} />
    </ChatContextProvider>
  );
}
