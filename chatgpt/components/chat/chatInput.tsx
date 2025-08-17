import { Pause, Plus, Send, Mic, MicOff, Paperclip, Image as ImageIcon, X } from "lucide-react";
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

type ExtendedFile = File & {
  uploadResult?: unknown;
};

const ChatInput = () => {
  const { isRequesting, sendMessage } = useChatContext();
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<ExtendedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 处理键盘事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, []);

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() && selectedFiles.length === 0) return;
    
    try {
      // 准备文件数据，包含上传结果
      const filesWithUploadInfo = selectedFiles.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size,
        uploadResult: file.uploadResult
      }));
      
      await sendMessage(inputValue, filesWithUploadInfo);
      setInputValue("");
      setSelectedFiles([]);
    } catch (error) {
      console.error('发送消息失败:', error);
    }
  }, [inputValue, selectedFiles, sendMessage]);

  // 移除文件
  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      try {
        setUploadProgress(0);
        const result = await uploadFile(
          file,
          (progress) => setUploadProgress(progress),
          new AbortController().signal
        );
        
        // 将上传成功的文件信息添加到选中文件列表
        const uploadedFile: ExtendedFile = Object.assign(file, { uploadResult: result });
        setSelectedFiles(prev => [...prev, uploadedFile]);
      } catch (error) {
        console.error('文件上传失败:', error);
      } finally {
        setUploadProgress(0);
      }
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // 上传文件
  const handleFileUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = '*/*';
      fileInputRef.current.click();
    }
  }, []);

  // 上传图片
  const handleImageUpload = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.click();
    }
  }, []);

  // 语音录制和转文字
  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      // 停止录音
      setIsRecording(false);
    } else {
      // 开始语音识别
      try {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          console.error('浏览器不支持语音识别');
          return;
        }

        const SpeechRecognition = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
        const recognition = new (SpeechRecognition as unknown as new () => {
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onstart: (() => void) | null;
          onresult: ((event: { results: { [key: number]: { [key: number]: { transcript: string } } } }) => void) | null;
          onerror: ((event: { error: string }) => void) | null;
          onend: (() => void) | null;
          start: () => void;
        })();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'zh-CN';

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(prev => prev + transcript);
        };

        recognition.onerror = (event) => {
          console.error('语音识别错误:', event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
      } catch (error) {
        console.error('启动语音识别失败:', error);
        setIsRecording(false);
      }
    }
  }, [isRecording]);
  return (
    <div className="absolute bottom-0 w-full bg-white z-20 flex justify-center">
      <div className="mt-2 mb-6 p-3 w-[640px] h-[130px] bg-slate-50 rounded-2xl flex flex-col relative">
        <div className="w-full rounded-md flex-1 overflow-auto">
          <Textarea 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            className="!border-0 !shadow-none !outline-none !ring-0 !focus:ring-0 !focus:border-0 bg-transparent resize-none h-full" 
          />
        </div>
        {/* 上传进度条 */}
        {uploadProgress > 0 && uploadProgress < 100 && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>上传中...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* 选中的文件显示 */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center bg-gray-100 rounded-lg px-3 py-2 text-sm border">
                <div className="flex items-center mr-2">
                  {file.type.startsWith('image/') ? (
                    <ImageIcon className="w-4 h-4 mr-1 text-blue-500" />
                  ) : (
                    <Paperclip className="w-4 h-4 mr-1 text-gray-500" />
                  )}
                  <span className="truncate max-w-32">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-auto p-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
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
                  <DropdownMenuItem onClick={toggleRecording}>
                    {isRecording ? (
                      <><MicOff className="mr-2 h-4 w-4" />停止录音</>
                    ) : (
                      <><Mic className="mr-2 h-4 w-4" />语音输入</>
                    )}
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
              disabled={isRequesting || (!inputValue.trim() && selectedFiles.length === 0)}
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
  );
};

export default ChatInput;
