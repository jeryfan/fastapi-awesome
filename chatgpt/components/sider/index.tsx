"use client";

import { cn } from "@/lib/utils";
import {
  FileText,
  Home,
  MessageSquare,
  Settings,
  Star,
  User,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

const NOT_SHOW_SIDER = ["/auth/login", "/auth/register", "/chat"];

const SiderBar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const navItems = [
    { icon: Home, label: "首页", path: "/upload" },
    { icon: FileText, label: "文件", path: "/tasks" },
    { icon: Star, label: "收藏", path: "/collections" },
    { icon: MessageSquare, label: "对话", path: "/chat" },
  ];

  if (NOT_SHOW_SIDER.find((item) => pathname.includes(item))) {
    return null;
  }

  return (
    <div className="flex-col items-center justify-start bg-elevated-secondary min-h-[32px] w-16 py-3 hidden sm:flex">
      <Image src="/icons/chatgpt.svg" width={24} height={24} alt="chatgpt" />
      {navItems.map((item, index) => {
        const isActive = pathname === item.path;
        return (
          <div
            key={index}
            onClick={() => router.push(item.path)}
            className={cn(
              "aspect-square flex flex-col items-center justify-center gap-1 p-1 mt-4 rounded-lg cursor-pointer hover:bg-slate-200 last:mt-auto ",
              isActive ? "bg-slate-200 text-black" : "text-gray-600 "
            )}
          >
            <span className="anticon cursor-pointer text-[1.2rem] !text-gray-2 mt-1">
              <item.icon className="w-4 h-4" />
            </span>

            <span className="text-[12px] font-medium">{item.label}</span>
          </div>
        );
      })}

      <div className="aspect-square flex flex-col items-center justify-center gap-1 p-1 rounded-lg cursor-pointer hover:bg-slate-200 last:mt-auto mt-auto">
        <span className="anticon cursor-pointer text-[1.2rem] !text-gray-2 mt-1">
          <Settings className="w-4 h-4" />
        </span>
        <span className="text-[12px] font-medium">设置</span>
      </div>

      <div className="flex items-center justify-center mt-2">
        <span className="data-[state=delayed-closed] w-7 h-7 rounded-[50%] text-[1rem] text-white bg-black text-center flex items-center justify-center cursor-pointer">
          <span className="anticon text-[#fff] text-[1rem]">
            <User className="w-4 h-4" />
          </span>
        </span>
      </div>
    </div>
  );
};

export default SiderBar;
