import { logout as logoutService } from '@/service/auth'

export function useAuth() {
  const logout = async () => {
    await logoutService()
    localStorage.removeItem('token')
  }

  return { logout }
}
