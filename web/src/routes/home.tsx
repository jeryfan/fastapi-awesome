import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

import {
  Bell,
  Cpu,
  File as FileIcon,
  Home,
  Link as LinkIcon,
  LogOut,
  Settings,
  UploadCloud,
  User,
} from 'lucide-react'

import { uploadFile } from '../service/file'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/home')({
  component: HomeComponent,
})

function HomeComponent() {
  const [progress, setProgress] = useState(0)

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(file, setProgress),
    onSuccess: () => {
      toast.success('文件上传成功！')
      setProgress(0)
    },
    onError: (error: any) => {
      toast.error('文件上传失败', {
        description: error.message || '请稍后重试。',
      })
      setProgress(0)
    },
  })

  const onDrop = (acceptedFiles: Array<File>) => {
    if (acceptedFiles.length > 0) {
      uploadMutation.mutate(acceptedFiles[0])
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[60px] items-center border-b px-6">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <Cpu className="h-6 w-6" />
              <span>MinerU</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-4 text-sm font-medium">
              <Link
                to="/home"
                className="flex items-center gap-3 rounded-lg bg-gray-100 px-3 py-2 text-gray-900  transition-all hover:text-gray-900 dark:bg-gray-800 dark:text-gray-50 dark:hover:text-gray-50"
              >
                <Home className="h-4 w-4" />
                首页
              </Link>
              <Link
                to="/home"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
              >
                <FileIcon className="h-4 w-4" />
                文件
              </Link>
            </nav>
          </div>
          <div className="mt-auto p-4">
            <nav className="grid items-start px-4 text-sm font-medium">
              <Link
                to="/login"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </Link>
              <Link
                to="/home"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
              >
                <Settings className="h-4 w-4" />
                设置
              </Link>
              <Link
                to="/home"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
              >
                <User className="h-4 w-4" />
                个人中心
              </Link>
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40">
          <div className="flex-1">
            <h1 className="font-semibold text-lg">
              人类智能防线：挑战终极AI BOSS
            </h1>
          </div>
          <div className="flex flex-1 items-center justify-end gap-4">
            <Button>立即使用</Button>
            <Button variant="outline" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <User className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
          <div className="flex flex-col items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight">
              MinerU 免费全能的文档解析神器！
            </h1>
            <div
              {...getRootProps()}
              className="w-full max-w-3xl rounded-lg border-2 border-dashed border-gray-300 p-12 text-center cursor-pointer"
            >
              <input {...getInputProps()} />
              <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-lg font-semibold text-gray-900">
                {isDragActive ? '拖拽文件到这里...' : '点击或拖拽上传文档'}
              </p>
              <p className="mt-2 text-sm text-gray-500">
                支持PDF、Word、PPT、图片等多种格式
              </p>
              <div className="mt-4 flex justify-center gap-4 text-xs text-gray-500">
                <span>单文档 ≤ 200MB, 600页</span>
                <span>单图片 ≤ 10MB</span>
                <span>批量上传 ≤ 20个</span>
              </div>
              {uploadMutation.isPending && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">{progress.toFixed(2)}%</p>
                </div>
              )}
              <div className="mt-6 flex justify-center gap-4">
                <Button variant="outline">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  URL 上传
                </Button>
                <Button>
                  <Cpu className="mr-2 h-4 w-4" />
                  模型：Mineru 2.0 内测
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
