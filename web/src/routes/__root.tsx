import {
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import Sidebar from '../components/Sidebar'
import TanStackQueryLayout from '../integrations/tanstack-query/layout.tsx'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

function RootComponent() {
  const { location } = useRouterState()
  const isAuthenticated = !!localStorage.getItem('token')
  const showSidebar = !['/login', '/register'].includes(location.pathname)

  return (
    <div className="flex h-screen bg-gray-50">
      {showSidebar && <Sidebar />}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      {/* <TanStackRouterDevtools /> */}
      <TanStackQueryLayout />
    </div>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootComponent,
})
