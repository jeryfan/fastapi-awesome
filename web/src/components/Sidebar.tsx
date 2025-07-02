import { Download, FileText, Home, Settings, User } from 'lucide-react'
import { useMatchRoute, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

const navItems = [
  { icon: Home, label: '首页', path: '/' },
  { icon: FileText, label: '文件', path: '/upload' },
]

const bottomItems = [{ icon: Download }, { icon: Settings }]

export default function Sidebar() {
  const router = useRouter()
  const matchRoute = useMatchRoute()

  const handleLogout = () => {
    // 这里替换为你的退出逻辑
    console.log('退出登录')
    router.navigate({ to: '/login' })
  }

  return (
    <aside className="flex flex-col justify-between bg-[#f9fafb] w-20 py-4 rounded-tr-2xl rounded-br-2xl">
      {/* 顶部区域 */}
      <div className="flex flex-col items-center gap-8">
        <div className="text-3xl font-bold text-black cursor-pointer">ن</div>

        {/* 菜单列表 */}
        <nav className="flex flex-col items-center gap-4">
          {navItems.map((item, index) => {
            const isActive = !!matchRoute({ to: item.path, fuzzy: false })
            return (
              <div
                key={index}
                onClick={() => router.navigate({ to: item.path })}
                className={cn(
                  'flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-colors cursor-pointer',
                  isActive
                    ? 'bg-[#f0f0f3] text-black'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                <item.icon className="w-5 h-5 mb-1" />
                <span className="text-xs">{item.label}</span>
              </div>
            )
          })}
        </nav>
      </div>

      {/* 底部区域 */}
      <div className="flex flex-col items-center gap-6">
        {bottomItems.map((item, idx) => (
          <item.icon key={idx} className="w-5 h-5 text-gray-700" />
        ))}

        {/* 用户头像 + Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white cursor-pointer">
              <User className="w-4 h-4" />
            </div>
          </PopoverTrigger>
          <PopoverContent side="right" align="center" className="w-32">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              退出登录
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </aside>
  )
}
