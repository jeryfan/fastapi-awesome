"use client";

import { useState, type FC, type ReactNode, useCallback, useMemo } from "react";
import { createContext, useContextSelector } from "use-context-selector";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  getConversationList,
  getConversationMessages,
  chatCompletion,
} from "@/service/chat";
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

type UploadedFile = {
  name: string;
  type: string;
  size: number;
  uploadResult?: unknown;
};

type MessageStatus = "sending" | "sent" | "error" | "streaming";

type Message = {
  id: string;
  content: string | MessageContent[];
  role: "user" | "assistant" | "system";
  status?: MessageStatus;
  error?: string;
  timestamp?: number;
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

  sendMessage: (
    content: string | MessageContent[],
    files?: UploadedFile[]
  ) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  deleteMessage: (messageId: string) => void;
  currentMessages: Message[];
  lastError: string | null;
  clearError: () => void;
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
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

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

  const sendMessage = useCallback(
    async (content: string | MessageContent[], files?: UploadedFile[]) => {
      if (!content || isRequesting) return;

      setIsRequesting(true);
      setLastError(null);

      try {
        // 创建用户消息
        const userMessage: Message = {
          id: Date.now().toString(),
          content,
          role: "user",
          status: "sent",
          timestamp: Date.now(),
        };

        // 添加用户消息到当前消息列表
        setCurrentMessages((prev) => [...prev, userMessage]);

        // 准备请求数据
        const requestData = {
          conversation_id: conversationId,
          model: "Qwen/Qwen3-8B",
          messages: [
            {
              role: "user",
              content,
            },
          ],
          stream: true,
        };

        // 发送请求并处理SSE流
        const response = await chatCompletion(
          conversationId || "",
          requestData
        );

        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let assistantContent = "";

          // 创建助手消息
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            content: "",
            role: "assistant",
            status: "streaming",
            timestamp: Date.now(),
          };

          setCurrentMessages((prev) => [...prev, assistantMessage]);

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") {
                  // 标记消息为已完成
                  setCurrentMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessage.id
                        ? { ...msg, status: "sent" }
                        : msg
                    )
                  );
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta;
                  if (delta?.content) {
                    assistantContent += delta.content;
                    // 更新助手消息内容
                    setCurrentMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === assistantMessage.id
                          ? { ...msg, content: assistantContent }
                          : msg
                      )
                    );
                  }
                } catch (e) {
                  // 忽略解析错误
                }
              }
            }
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "发送消息失败";
        console.error("发送消息失败:", error);
        setLastError(errorMessage);

        // 标记最后一条消息为错误状态
        setCurrentMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === "assistant") {
            return prev.map((msg, index) =>
              index === prev.length - 1
                ? { ...msg, status: "error", error: errorMessage }
                : msg
            );
          }
          return prev;
        });
      } finally {
        setIsRequesting(false);
      }
    },
    [conversationId, isRequesting]
  );

  // 重试消息
  const retryMessage = useCallback(
    async (messageId: string) => {
      const message = currentMessages.find((msg) => msg.id === messageId);
      if (!message || message.role !== "user") return;

      // 移除错误的助手消息
      setCurrentMessages((prev) => {
        const messageIndex = prev.findIndex((msg) => msg.id === messageId);
        if (messageIndex !== -1) {
          return prev.slice(0, messageIndex + 1);
        }
        return prev;
      });

      // 重新发送消息
      await sendMessage(message.content);
    },
    [currentMessages, sendMessage]
  );

  // 删除消息
  const deleteMessage = useCallback((messageId: string) => {
    setCurrentMessages((prev) => prev.filter((msg) => msg.id !== messageId));
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const contextValue = useMemo<ChatContextValue>(
    () => ({
      conversationId,
      setConversationId: () => {},

      conversationList: conversationListData?.list ?? [],
      isConversationListLoading,
      conversationListError,
      refetchConversationList,

      messages: messagesData?.messages ?? currentMessages,
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
      sendMessage,
      retryMessage,
      deleteMessage,
      currentMessages,
      lastError,
      clearError,
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
      sendMessage,
      retryMessage,
      deleteMessage,
      currentMessages,
      lastError,
      clearError,
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
