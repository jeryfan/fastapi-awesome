import { createFileRoute } from '@tanstack/react-router'
import Tasks from '@/components/tasks'

export const Route = createFileRoute('/tasks')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Tasks />
}
