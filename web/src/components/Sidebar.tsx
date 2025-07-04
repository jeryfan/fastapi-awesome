import { Download, FileText, Home, Settings, Star, User } from 'lucide-react'
import { useMatchRoute, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import MinerULogo from '@/assets/icons/mineru.svg'

const navItems = [
  { icon: Home, label: '首页', path: '/upload' },
  { icon: FileText, label: '文件', path: '/tasks' },
  { icon: Star, label: '收藏', path: '/collections' },
]

const bottomItems = [{ icon: Download }, { icon: Settings }]

export default function Sidebar() {
  const router = useRouter()
  const matchRoute = useMatchRoute()

  const handleLogout = () => {
    console.log('退出登录')
    router.navigate({ to: '/login' })
  }

  return (
    <div className="flex-col items-center justify-start min-h-[32px] w-16 py-3 hidden sm:flex">
      <img src={MinerULogo} className="w-[2rem] h-[2rem]" />
      {navItems.map((item, index) => {
        const isActive = !!matchRoute({ to: item.path, fuzzy: false })
        return (
          <div
            key={index}
            onClick={() => router.navigate({ to: item.path })}
            className={cn(
              'aspect-square flex flex-col items-center justify-center gap-1 p-1 mt-4 rounded-lg cursor-pointer hover:bg-slate-200 last:mt-auto ',
              isActive ? 'bg-slate-200 text-black' : 'text-gray-600 ',
            )}
          >
            <span className="anticon cursor-pointer text-[1.2rem] !text-gray-2 mt-1">
              <item.icon className="w-4 h-4" />
            </span>

            <span className="text-[12px] font-medium">{item.label}</span>
          </div>
        )
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
  )
}
