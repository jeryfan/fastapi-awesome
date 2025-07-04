import { useState } from 'react'
import { Apple, AppleIcon, Bell, Layers } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import UrlUploader from './UrlUploader'
import FileUploader from './FileUploader'
import { TaskList } from './tasks'

const Uploader = () => {
  const [mode, setMode] = useState<'file' | 'url'>('file')

  return (
    <div className="min-h-full min-w-full w-full h-full flex justify-center items-center px-4 sm:px-6 relative">
      <div className="relative w-full items-center justify-center py-2 !absolute top-0 right-0 0 z-[9] hidden sm:block"></div>
      <div className="absolute top-[50vh] translate-y-[-40%] left-1/2 -translate-x-1/2 w-full min-h-[800px] max-h-[1000px] max-w-auto sm:max-w-[400px] md:max-w-[600px] lg:max-w-[800px] xl:max-w-[1300px] bg-[url('https://webpub.shlab.tech/MinerU/static/assets/mineru-bg.png')] bg-cover bg-center bg-no-repeat aspect-[1230/680]"></div>
      <div className="w-full h-full flex flex-col relative justify-center items-center max-w-full sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] xl:max-w-[900px]">
        <div className="fixed top-[4rem] right-[3rem] flex gap-2 z-[9]">
          <Button variant={'outline'}>
            <Apple />
            下载客户端
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={'outline'}
                  size={'icon'}
                  className="border-none px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                >
                  <Bell />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end">
                <a href="https://github.com/yunyoujun/chatbot">通知</a>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                size={'icon'}
                className="border-none px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                <Layers />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80"
              side="bottom"
              align="end"
              sideOffset={4}
            >
              <TaskList />
            </PopoverContent>
          </Popover>
        </div>
        <div className="h-auto sm:h-[280px] w-full">
          {mode === 'file' ? (
            <FileUploader onSwitchToUrl={() => setMode('url')} />
          ) : (
            <UrlUploader onCancel={() => setMode('file')} />
          )}
        </div>
      </div>
    </div>
  )
}

export default Uploader
