"use client";
import { type } from "os";
import { useState, type FC, type ReactNode } from "react";
import {
  createContext,
  useContext,
  useContextSelector,
} from "use-context-selector";

type Conversation = {
  id: string;
  name: string;
};

export type ChatContextValue = {
  conversationId: string | null;
  setConversationId: (id: string | null) => void;

  conversationList: Conversation[];

  isSiderShow: boolean;
  useSelector: typeof useSelector;
};

const ChatContext = createContext<ChatContextValue>({
  conversationId: null,
  setConversationId: () => {},
  conversationList: [],
  isSiderShow: false,
  useSelector,
});

export function useSelector<T>(selector: (value: ChatContextValue) => T): T {
  return useContextSelector(ChatContext, selector);
}

export type ChatContextProviderProps = {
  children: ReactNode;
};

export const ChatContextProvider: FC<ChatContextProviderProps> = ({
  children,
}) => {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [isSiderShow, setIsSiderShow] = useState<boolean>(false);

  

  return (
    <ChatContext.Provider
      value={{
        conversationId,
        setConversationId,
        conversationList: [],
        isSiderShow: false,
        useSelector,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);

export default ChatContext;
