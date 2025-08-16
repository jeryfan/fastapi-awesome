"use client";
import Link from "next/link";
import { Button } from "../ui/button";
import Image from "next/image";
import { Edit, PanelLeft, Search } from "lucide-react";
import { useRouter } from "next/navigation";
const ChatSider = () => {
  const router = useRouter();

  const actions = [
    {
      name: "新聊天",
      icon: <Edit className="w-4 h-4" />,
      onClick: () => {
        router.push("/chat");
      },
    },
    {
      name: "搜索聊天",
      icon: <Search className="w-4 h-4" />,
      onClick: () => {
        router.push("/chat");
      },
    },
  ];

  return (
    <div className="relative w-[260px] h-full bg-elevated-secondary z-20 px-2 flex flex-col items-center text-sm">
      <div className="flex justify-between items-center w-full h-[52px]">
        <div className="">
          <Link
            href="/"
            className="w-9 h-9 no-draggable hover:bg-token-surface-hover focus-visible:bg-token-surface-hover touch:h-10 touch:w-10 flex items-center justify-center rounded-lg focus-visible:outline-0 disabled:opacity-50"
          >
            <Image
              width={24}
              height={24}
              src="/icons/chatgpt.svg"
              alt="chatgpt"
              draggable={false}
            />
          </Link>
        </div>
        <Button
          variant="ghost"
          className="w-9 h-9 flex items-center justify-center"
        >
          <PanelLeft className="w-4 h-4" />
        </Button>
      </div>

      {actions.map((item) => (
        <div
          key={item.name}
          className="mt-1 w-full h-10 rounded-lg flex items-center gap-x-2 px-2 hover:bg-slate-100 cursor-pointer"
          onClick={item.onClick}
        >
          {item.icon}
          {item.name}
        </div>
      ))}
    </div>
  );
};

export default ChatSider;
