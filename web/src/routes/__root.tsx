import {
  Outlet,
  createRootRouteWithContext,
  redirect,
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
  const showSidebar = !['/login', '/register'].includes(location.pathname)

  return (
    <div className="w-full flex-1 flex bg-[#F9FAFB] pb-2 pr-3">
      {showSidebar && <Sidebar />}
      <div className="flex flex-1 overflow-hidden bg-white shadow-sm rounded-xl sm:min-w-[600px] min-h-[400px] h-full w-full relative">
        <div className="absolute right-0 top-0 h-full left-0">
          <Outlet />
        </div>
      </div>
      {/* <TanStackRouterDevtools /> */}
      <TanStackQueryLayout />
    </div>
  )
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: ({ location }) => {
    const isAuthenticated = !!localStorage.getItem('access_token')
    if (
      !isAuthenticated &&
      location.pathname !== '/login' &&
      location.pathname !== '/register'
    ) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      })
    }
  },
  component: RootComponent,
})
