import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="focus:outline-none">
        <img
          src="https://github.com/shadcn.png"
          alt="User Avatar"
          className="w-10 h-10 rounded-full"
        />
      </button>
      {isOpen && (
        <div className="absolute bottom-12 left-0 w-48 bg-white rounded-md shadow-lg py-1">
          <Button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            variant="ghost"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </Button>
        </div>
      )}
    </div>
  )
}
