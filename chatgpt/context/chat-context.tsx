"use client";

import { useState, type FC, type ReactNode, useCallback, useMemo } from "react";
import { createContext, useContextSelector } from "use-context-selector";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getConversationList, getConversationMessages } from "@/service/chat";
import { useParams } from "next/navigation";

type ConversationListResponse = {
  list: Conversation[];
  total: number;
};

type ConversationMessagesResponse = {
  id: string;
  title: string;
  messages: Message[];
  current_model: string;
};

type Conversation = {
  id: string;
  name: string;
};

type MessageContent = {
  type: "text" | "image";
  text?: string;
  image_url?: string;
};

type Message = {
  id: string;
  content: string | MessageContent[];
  role: "user" | "assistant" | "system";
};

export type ChatContextValue = {
  conversationId: string | null;
  setConversationId: (id: string | null) => void;

  conversationList: Conversation[];
  isConversationListLoading: boolean;
  conversationListError: Error | null;
  refetchConversationList: () => void;

  messages: Message[];
  isMessagesLoading: boolean;
  messagesError: Error | null;

  isSiderShow: boolean;
  toggleSider: () => void;
  setIsSiderShow: (show: boolean) => void;

  keyword: string;
  setKeyword: (keyword: string) => void;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;

  isRequesting: boolean;
  setIsRequesting: (isRequesting: boolean) => void;

  sendMessage: (message: Message) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useSelector<T>(selector: (value: ChatContextValue) => T): T {
  const context = useContextSelector(ChatContext, (value) => {
    if (value === null) {
      throw new Error("useSelector must be used within a ChatContextProvider");
    }
    return selector(value);
  });
  return context;
}

export type ChatContextProviderProps = {
  children: ReactNode;
};

export const ChatContextProvider: FC<ChatContextProviderProps> = ({
  children,
}) => {
  // const [conversationId, setConversationId] = useState<string | null>(null);
  const params = useParams();
  const conversationId =
    params.id && Array.isArray(params.id) && params.id.length > 0
      ? params.id[0]
      : null;
  const [isSiderShow, setIsSiderShow] = useState<boolean>(true);

  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);
  const [keyword, setKeyword] = useState<string>("");

  const [isRequesting, setIsRequesting] = useState<boolean>(false);

  const {
    data: conversationListData,
    isLoading: isConversationListLoading,
    error: conversationListError,
    refetch: refetchConversationList,
  }: UseQueryResult<ConversationListResponse, Error> = useQuery({
    queryKey: ["conversations", page, limit, keyword],
    queryFn: () => getConversationList(page, limit, keyword),
  });

  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    error: messagesError,
  }: UseQueryResult<ConversationMessagesResponse, Error> = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => {
      return getConversationMessages(conversationId!);
    },
    enabled: !!conversationId,
  });

  const toggleSider = useCallback(() => {
    setIsSiderShow((prev) => !prev);
  }, []);

  const contextValue = useMemo<ChatContextValue>(
    () => ({
      conversationId,
      setConversationId: () => {},

      conversationList: conversationListData?.list ?? [],
      isConversationListLoading,
      conversationListError,
      refetchConversationList,

      messages: messagesData?.messages ?? [],
      isMessagesLoading,
      messagesError,

      isSiderShow,
      toggleSider,
      setIsSiderShow,

      keyword,
      setKeyword,
      page,
      setPage,
      limit,
      setLimit,

      isRequesting,
      setIsRequesting,
    }),
    [
      conversationId,
      conversationListData,
      isConversationListLoading,
      conversationListError,
      refetchConversationList,
      messagesData,
      isMessagesLoading,
      messagesError,
      isSiderShow,
      toggleSider,
      keyword,
      page,
      limit,
      isRequesting,
      setIsRequesting,
    ]
  );

  return (
    <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>
  );
};

export const useChatContext = (): ChatContextValue => {
  const context = useContextSelector(ChatContext, (value) => value);
  if (context === null) {
    throw new Error("useChatContext must be used within a ChatContextProvider");
  }
  return context;
};

export default ChatContext;
