import { Pause, Plus, Send } from "lucide-react";
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

const ChatInput = () => {
  const { isRequesting, setIsRequesting } = useChatContext();
  return (
    <div className="absolute bottom-0 w-full bg-white z-20 flex justify-center">
      <div className="mt-2 mb-6 p-3 w-[640px] h-[130px] bg-slate-50 rounded-2xl flex flex-col relative">
        <div className="w-full rounded-md flex-1 overflow-auto">
          <Textarea className="!border-0 !shadow-none !outline-none !ring-0 !focus:ring-0 !focus:border-0 bg-transparent resize-none h-full" />
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
              <DropdownMenuContent className="w-32" align="start">
                <DropdownMenuGroup>
                  <DropdownMenuItem>上传文件</DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="">
            <Button
              className="rounded-full w-8 h-8 cursor-pointer"
              variant="outline"
              onClick={() => {
                setIsRequesting(true);
              }}
            >
              {isRequesting ? <Pause /> : <Send />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
