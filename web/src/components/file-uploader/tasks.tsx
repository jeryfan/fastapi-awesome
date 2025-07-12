import React from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Check, CheckCircle, File, LoaderIcon } from 'lucide-react'
import { useAtomValue } from 'jotai'
import Spin from '../Spin'
import { taskList } from '@/service/task'
import { Skeleton } from '@/components/ui/skeleton'
import PDFIcon from '@/assets/icons/pdf.svg'
import { uploadingTasksAtom } from '@/atoms/upload'

export function TaskList() {
  const uploadingTasks = useAtomValue(uploadingTasksAtom)
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ['tasks'],
    queryFn: taskList,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, size, total } = lastPage
      const totalPages = Math.ceil(total / size)
      return page < totalPages ? page + 1 : undefined
    },
  })

  console.log('data:', data)

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
    <div className="bg-white relative z-10 pb-4 min-w-[10rem] min-h-[6rem] ">
      <h2 className="text-[1rem] font-semibold px-6 my-4">上传记录</h2>
      <div
        onScroll={handleScroll}
        className="h-[10rem] px-4 mb-4 overflow-auto"
      >
        {uploadingTasks.length > 0 &&
          uploadingTasks.map((task: any) => (
            <div
              key={task.id}
              className="relative flex items-center overflow-x-hidden overflow-y-visible px-2 justify-start w-[16rem] h-[2.5rem] mb-3 group hover:bg-slate-100 rounded-lg group cursor-pointer transition-all duration-300 ease-out"
            >
              <img
                src={PDFIcon}
                className="min-w-[1.6rem] mr-2 group-hover:min-w-[1.8rem] duration-100"
              />
              <span className="block truncate overflow-hidden relative font-semibold text-ellipsis max-w-[calc(100%-4rem)] text-sm">
                {task.file_name || task.file_name}
              </span>

              <div className="flex items-center justify-center ml-auto relative top-[0.1rem] h-6 w-6">
                <span className=" absolute inset-0 flex items-center justify-center transition-all duration-500 opacity-100">
                  {/* <Loader className="text-gray-400 animate-spin" /> */}
                  {/* <Spin /> */}
                </span>
                {/* <div className="absolute inset-0 flex items-center justify-center transition-all duration-300 opacity-100 scale-100"></div> */}
              </div>

              <div className="w-4 h-4 ml-auto  mr-2 inline-block animate-pulse">
                <LoaderIcon className="animate-spin w-4 h-4" />
              </div>
              <span className="text-sm whitespace-nowrap">上传中</span>
            </div>
          ))}
        {data.pages.map((group, i) => (
          <React.Fragment key={i}>
            {group.list.map((task: any) => (
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

                <img
                  src={PDFIcon}
                  className="min-w-[1.6rem] mr-2 group-hover:min-w-[1.8rem] duration-100"
                />
                <span className="block truncate overflow-hidden relative font-semibold text-ellipsis max-w-[calc(100%-4rem)] text-sm">
                  {task.file_name || '未知文件名'}
                </span>

                <div className="flex items-center justify-center ml-auto relative top-[0.1rem] h-6 w-6">
                  <span className="anticon text-[2rem] absolute inset-0 flex items-center justify-center bg-[#00B365] rounded-full text-white transition-all duration-500 opacity-100 scale-75 ">
                    <Check className="w-4 h-4" />
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
      </div>
    </div>
  )
}
