"use client";

import { FC, useState, useEffect, memo } from "react";
import { Bot, User, CircleDashed, Clipboard, Check, Edit, RotateCcw, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";

// =======================================================================
// 1. 类型定义
// =======================================================================
export type MessageContent =
  | string
  | Array<
      | {
          type: "text";
          text: string;
        }
      | {
          type: "image_url";
          image_url: { url: string };
        }
    >;

export interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: MessageContent;
  className?: string;
  avatar?: string;
  isStreaming?: boolean;
  status?: "sending" | "sent" | "error" | "streaming";
  error?: string;
  messageId?: string;
  onRetry?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
}

// =======================================================================
// 2. 子组件
// =======================================================================
const TypingIndicator = () => (
  <div className="flex items-center gap-1.5 text-muted-foreground">
    <span
      className="h-2 w-2 rounded-full bg-current animate-bounce"
      style={{ animationDelay: "0ms" }}
    />
    <span
      className="h-2 w-2 rounded-full bg-current animate-bounce"
      style={{ animationDelay: "150ms" }}
    />
    <span
      className="h-2 w-2 rounded-full bg-current animate-bounce"
      style={{ animationDelay: "300ms" }}
    />
  </div>
);

const MemoizedMarkdown: FC<{ markdownText: string }> = memo(
  ({ markdownText }) => {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code(props) {
              const { children, className, node, ...rest } = props;
              const match = /language-(\w+)/.exec(className || "");
              const language = match ? match[1] : "";
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="bg-muted px-1 py-0.5 rounded text-sm" {...rest}>
                    {children}
                  </code>
                );
              }
              return (
                <CodeBlock language={language}>
                  {String(children).trimEnd()}
                </CodeBlock>
              );
            },
          }}
        >
          {markdownText}
        </ReactMarkdown>
      </div>
    );
  }
);
MemoizedMarkdown.displayName = "MemoizedMarkdown";

interface CodeBlockProps {
  language: string;
  children: string;
}

const CodeBlock: FC<CodeBlockProps> = ({ language, children }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children.trimEnd());
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy code: ", error);
      alert("复制代码失败!");
    }
  };

  return (
    <div className="rounded-md border bg-muted/20 text-sm my-4 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/40 text-muted-foreground">
        <span className="font-sans text-xs lowercase">{language}</span>
        <div className="flex items-center gap-x-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-x-1 p-1 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="复制代码"
          >
            {isCopied ? (
              <Check size={14} className="text-green-500" />
            ) : (
              <Clipboard size={14} />
            )}
            <span className="text-xs">{isCopied ? "已复制" : "复制"}</span>
          </button>
        </div>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ margin: 0, padding: "1rem", fontSize: "0.875rem" }}
        codeTagProps={{
          style: { fontFamily: '"Fira Code", "Courier New", monospace' },
        }}
        showLineNumbers
      >
        {children.trimEnd()}
      </SyntaxHighlighter>
    </div>
  );
};

// =======================================================================
// 3. Hook
// =======================================================================
const useTypewriter = (
  text: string,
  isStreaming: boolean,
  speed: number = 30
) => {
  const [displayedText, setDisplayedText] = useState("");
  useEffect(() => {
    if (isStreaming) {
      let i = 0;
      setDisplayedText("");
      const intervalId = setInterval(() => {
        if (i < text.length) {
          setDisplayedText((prev) => prev + text.charAt(i));
          i++;
        } else {
          clearInterval(intervalId);
        }
      }, speed);
      return () => clearInterval(intervalId);
    } else {
      setDisplayedText(text);
    }
  }, [text, isStreaming, speed]);
  return displayedText;
};

// =======================================================================
// 4. 主组件
// =======================================================================
export const ChatMessage: FC<ChatMessageProps> = ({
  role,
  content,
  className,
  avatar,
  isStreaming = false,
  status = "sent",
  error,
  messageId,
  onRetry,
  onDelete,
}) => {
  const hasContent = Array.isArray(content) ? content.length > 0 : !!content;
  const isAssistant = role === "assistant";
  const textContent =
    typeof content === "string"
      ? content
      : content.find((part) => part.type === "text")?.text || "";
  
  // 始终调用 useTypewriter hook
  const displayedText = useTypewriter(textContent, isAssistant && isStreaming);
  
  if (role === "system") {
    return (
      <div className="flex items-center justify-center text-xs text-gray-400 italic my-4">
        <CircleDashed className="w-4 h-4 mr-2 animate-spin-slow" />
        <span>{(content as string) || "系统消息"}</span>
      </div>
    );
  }

  const AvatarComponent = (
    <Avatar className="w-8 h-8">
      <AvatarImage src={avatar} />
      <AvatarFallback>
        {isAssistant ? (
          <Bot className="w-5 h-5" />
        ) : (
          <User className="w-5 h-5" />
        )}
      </AvatarFallback>
    </Avatar>
  );

  const renderContent = () => {
    if (!hasContent) return null;
    if (typeof content === "string") {
      return <MemoizedMarkdown markdownText={displayedText} />;
    }
    return (
      <div className="flex flex-col gap-2">
        {content.map((part, index) => {
          if (part.type === "text") {
            const textToRender =
              index === content.length - 1 && isAssistant && isStreaming
                ? displayedText
                : part.text;
            return <MemoizedMarkdown key={index} markdownText={textToRender} />;
          }
          if (part.type === "image_url") {
            return (
              <div key={index}>
                <Image
                  src={part.image_url.url}
                  alt="用户上传的图片"
                  className="max-w-xs rounded-lg border object-cover"
                  width={300}
                  height={300}
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  const renderStatusIndicator = () => {
    if (status === "error" && error) {
      return (
        <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
          <span>发送失败: {error}</span>
          {messageId && onRetry && (
            <button
              onClick={() => onRetry(messageId)}
              className="flex items-center gap-1 px-2 py-1 bg-red-100 hover:bg-red-200 rounded text-red-600 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              重试
            </button>
          )}
        </div>
      );
    }
    if (status === "sending") {
      return (
        <div className="flex items-center gap-2 mt-2 text-gray-500 text-sm">
          <CircleDashed className="w-3 h-3 animate-spin" />
          <span>发送中...</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={cn(
        "flex items-start gap-4 my-4",
        { "justify-end": !isAssistant },
        className
      )}
    >
      {isAssistant && AvatarComponent}
      <div className="flex flex-col max-w-[80%]">
        <div
          className={cn("group relative px-4 py-2 rounded-lg", {
            "bg-muted rounded-br-none": !isAssistant,
            "bg-muted rounded-bl-none": isAssistant,
            "min-h-[40px] flex items-center":
              isAssistant && !hasContent && !isStreaming,
            "border-red-200 bg-red-50": status === "error",
          })}
        >
          {isAssistant && !hasContent && !isStreaming ? (
            <TypingIndicator />
          ) : (
            renderContent()
          )}
          {isAssistant && isStreaming && textContent === displayedText && (
            <span className="animate-pulse">▍</span>
          )}
          
          {/* 消息操作按钮 */}
          {messageId && (onRetry || onDelete) && (
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex gap-1">
                {onDelete && (
                  <button
                    onClick={() => onDelete(messageId)}
                    className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-red-500 transition-colors"
                    title="删除消息"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        {renderStatusIndicator()}
      </div>
      {!isAssistant && AvatarComponent}
    </div>
  );
};
