import {
  Pause,
  Plus,
  Send,
  Mic,
  MicOff,
  Paperclip,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { useChatContext } from "@/context/chat-context";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useState, useRef, useCallback } from "react";
import { uploadFile } from "@/service/file";
import { Progress } from "../ui/progress";
import Image from "next/image";
import ClipLoader from "react-spinners/ClipLoader";
type ExtendedFile = File & {
  uploadResult?: unknown;
  uploadProgress?: number;
  isUploading?: boolean;
};
type FileItem = File & {
  uploadProgress: number;
  isUploading: boolean;
  file_url: string;
};
const ChatInput = () => {
  const { isRequesting, sendMessage } = useChatContext();
  const [inputValue, setInputValue] = useState("");

  const [selectedFiles, setSelectedFiles] = useState<ExtendedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileList, setFileList] = useState<FileItem[]>([]);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, []);
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() && selectedFiles.length === 0) return;
    try {
      let content: any;
      if (fileList.length > 0) {
        content = fileList.map((item: FileItem) => ({
          type: "image_url",
          image_url: {
            url: item.file_url,
          },
        }));
        content.unshift({ type: "text", text: inputValue.trim() });
      } else {
        content = inputValue.trim();
      }
      await sendMessage(content);
      setInputValue("");
      setSelectedFiles([]);
    } catch (error) {
      console.error("发送消息失败:", error);
    }
  }, [inputValue, fileList, sendMessage]);
  const removeFile = useCallback((index: number) => {
    setFileList((prev) => prev.filter((_, i) => i !== index));
  }, []);
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const newFiles: FileItem[] = files.map((file) =>
        Object.assign(file, {
          uploadProgress: 0,
          isUploading: true,
          file_url: "",
        })
      );
      setFileList((prev) => [...prev, ...newFiles]);
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileIndex = fileList.length + i;
        try {
          const result = await uploadFile(
            file,
            (progress) => {
              setFileList((prev) =>
                prev.map((f, index) =>
                  index === fileIndex ? { ...f, uploadProgress: progress } : f
                )
              );
            },
            new AbortController().signal
          );
          setFileList((prev) =>
            prev.map((f, index) =>
              index === fileIndex
                ? {
                    ...f,
                    isUploading: false,
                    uploadProgress: 100,
                    file_url: result.file_url,
                  }
                : f
            )
          );
        } catch (error) {
          console.error("文件上传失败:", error);
          setFileList((prev) => prev.filter((_, index) => index !== fileIndex));
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [fileList.length]
  );
  const handleFileUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "*/*";
      fileInputRef.current.click();
    }
  }, []);
  const handleImageUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.click();
    }
  }, []);
  return (
    <div className="absolute bottom-0 w-full bg-white z-20 flex justify-center">
      <div className="w-[640px] flex flex-col">
        <div className="mt-2 mb-6 p-3 w-full min-h-[130px] bg-slate-50 rounded-2xl flex flex-col relative">
          {fileList.length > 0 && (
            <div className="">
              <div className="flex flex-wrap gap-3">
                {fileList.map((file, index) => (
                  <div key={index} className="relative">
                    {file.file_url ? (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border bg-white group">
                        <Image
                          src={file.file_url}
                          alt={file.name || "记载中"}
                          width={80}
                          height={80}
                        />
                        <div className="absolute inset-0 flex items-start justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 h-6 w-6 p-0 bg-gray-700 hover:bg-gray-800 text-white rounded-full hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-20 h-20 rounded-lg border bg-white flex flex-col items-center justify-center p-2 group">
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center rounded-lg">
                          <ClipLoader color="#ffffff" size={20} />
                          <div className="text-white text-xs font-medium mt-1">
                            {file.uploadProgress || 0}%
                          </div>
                        </div>
                        <div className="absolute inset-0 flex items-start justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 h-6 w-6 p-0 bg-gray-700 hover:bg-gray-800 text-white rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="w-full rounded-md flex-1 overflow-auto">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              className="!border-0 !shadow-none !outline-none !ring-0 !focus:ring-0 !focus:border-0 bg-transparent resize-none h-full"
            />
          </div>
          <div className="relative bottom-0 w-full h-[44px] flex items-end justify-between">
            <div className="">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="rounded-full w-[30px] h-[30px] cursor-pointer"
                    variant="outline"
                  >
                    <Plus />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40" align="start">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleFileUpload}>
                      <Paperclip className="mr-2 h-4 w-4" />
                      上传文件
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleImageUpload}>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      上传图片
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="">
              <Button
                className="rounded-full w-8 h-8 cursor-pointer"
                variant="outline"
                onClick={handleSendMessage}
                disabled={
                  isRequesting ||
                  (!inputValue.trim() && selectedFiles.length === 0)
                }
              >
                {isRequesting ? <Pause /> : <Send />}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ChatInput;
