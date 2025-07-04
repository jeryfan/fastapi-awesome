import React from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle2,
  File,
  FileText,
  GitPullRequestDraftIcon,
} from 'lucide-react'
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
    getNextPageParam: (lastPage) => {
      const { page, size, total } = lastPage
      const totalPages = Math.ceil(total / size)
      return page < totalPages ? page + 1 : undefined
    },
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
    <div
      className="bg-white relative z-10 pb-4 min-w-[10rem] min-h-[6rem]"
      onScroll={handleScroll}
    >
      <h2 className="text-[1rem] font-semibold px-6 my-4">上传记录</h2>
      <ScrollArea onScroll={handleScroll} className="h-[10rem] px-4 mb-4">
        {data.pages.map((group, i) => (
          <React.Fragment key={i}>
            {group.tasks.map((task: Task) => (
              <div
                key={task.task_id}
                className="relative flex items-center overflow-x-hidden overflow-y-visible px-2 justify-start w-[16rem] h-[2.5rem] mb-3 group hover:bg-slate-100 rounded-lg group cursor-pointer transition-all duration-300 ease-out"
              >
                {task.state === 'done' && (
                  <File className="min-w-[1.6rem] mr-2 group-hover:min-w-[1.8rem] duration-100" />
                )}
                {task.state === 'error' && (
                  <File className="min-w-[1.6rem] mr-2 group-hover:min-w-[1.8rem] duration-100" />
                )}

                <span className="block truncate overflow-hidden relative font-semibold text-ellipsis max-w-[calc(100%-4rem)] text-sm">
                  {task.file_name || '未知文件名'}
                </span>

                <div className="flex items-center justify-center ml-auto relative top-[0.1rem] h-6 w-6">
                  <span className="anticon text-[2rem] absolute inset-0 flex items-center justify-center text-[#00B365] transition-all duration-500 opacity-0 scale-75 -rotate-90">
                    <AlertCircle className="w-4 h-4" />
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center transition-all duration-300 opacity-100 scale-100"></div>
                </div>
                <div className="text-sm whitespace-nowrap"></div>
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
      </ScrollArea>
    </div>
  )
}
