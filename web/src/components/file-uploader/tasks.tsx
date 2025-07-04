// src/components/TaskList.tsx

import React from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle2, FileText } from 'lucide-react'
import type { Task } from '@/service/task'
import { fetchTasks } from '@/service/task'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge' // Let's add Badges for the state

// Helper to format the timestamp
const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function TaskList() {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      if (hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    }
  }

  if (status === 'pending') {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return <div className="p-4 text-destructive">Error: {error.message}</div>
  }

  return (
    <ScrollArea className="h-96 w-full" onScroll={handleScroll}>
      <div className="p-2">
        {data.pages.map((group, i) => (
          <React.Fragment key={i}>
            {group.tasks.map((task: Task) => (
              <div
                key={task.task_id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-accent"
              >
                {/* Icon based on state */}
                {task.state === 'done' && (
                  <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-500" />
                )}
                {task.state === 'error' && (
                  <AlertCircle className="h-5 w-5 mt-0.5 text-destructive" />
                )}

                <div className="flex-1">
                  <p className="text-sm font-medium leading-none truncate">
                    {task.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(task.created_at)}
                  </p>
                </div>

                {/* State Badge */}
                <Badge
                  variant={task.state === 'error' ? 'destructive' : 'secondary'}
                >
                  {task.state}
                </Badge>
              </div>
            ))}
          </React.Fragment>
        ))}

        <div className="py-4 text-center text-sm text-muted-foreground">
          {isFetchingNextPage
            ? '加载更多...'
            : hasNextPage
              ? ''
              : '已加载全部任务'}
        </div>
      </div>
    </ScrollArea>
  )
}
