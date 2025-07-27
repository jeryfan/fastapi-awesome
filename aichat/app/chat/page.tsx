"use client";
import { Button } from "@/components/ui/button";
import { MenuIcon, Plus } from "lucide-react";
import Image from "next/image";
import TextareaAutosize from "react-textarea-autosize";

const Chat = () => {
  return (
    <div className="w-screen h-full">
      <div className="w-full h-full px-10">
        <div className="relative w-full h-30 p-3  rounded-2xl border-1 flex flex-col ">
          <TextareaAutosize
            placeholder="询问任何问题"
            maxRows={2}
            className="flex-1 w-full border-none focus-visible:ring-0 focus:outline-none resize-none text-base"
          />
          <div className="w-full h-8 flex justify-between">
            <div className="flex items-center">
              <Button className="rounded-full " variant={"ghost"}>
                <Plus width={20} height={20} />
              </Button>
              <Button className=" " variant={"ghost"}>
                <Image
                  src={"/icons/tools.svg"}
                  alt="tools"
                  width={20}
                  height={20}
                />
                工具
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
