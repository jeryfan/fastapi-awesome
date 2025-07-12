import { useCallback, useMemo, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Link, LucideUploadCloud } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { uploadFile } from '@/service/file'
import { taskCreate } from '@/service/task'
import { addUploadTaskAtom, removeUploadTaskAtom } from '@/atoms/upload'

const FileUploader = ({
  onSwitchToUrl,
  setPopoverOpen,
}: {
  onSwitchToUrl: () => void
  setPopoverOpen: (open: boolean) => void
}) => {
  const addUploadTask = useSetAtom(addUploadTaskAtom)
  const removeUploadTask = useSetAtom(removeUploadTaskAtom)
  const acceptedFileTypes = useMemo(
    () => ({
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc', '.docx'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
      'application/vnd.ms-powerpoint': ['.ppt', '.pptx'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        ['.pptx'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    }),
    [],
  )
  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      uploadFile(file, (progress) => {
        console.log('上传进度:', progress)
      }),
  })
  const onDrop = useCallback(
    (acceptedFiles: Array<File>) => {
      if (!acceptedFiles.length) return
      setPopoverOpen(true)
      acceptedFiles.forEach((file) => {
        const id = uuidv4()
        addUploadTask({ id, file_name: file.name, file_type: file.type })

        uploadMutation.mutate(file, {
          onSuccess: async ({ data }) => {
            await taskCreate(data.id)
            removeUploadTask(id)
          },
          onError: () => {
            removeUploadTask(id)
          },
        })
      })
    },
    [uploadMutation],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    multiple: true,
    maxFiles: 20,
  })

  return (
    <div
      {...getRootProps()}
      className={`w-full h-full border border-dashed rounded-[20px] cursor-pointer text-center bg-white ${
        isDragActive ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      <input {...getInputProps()} tabIndex={-1} />

      <div className="border-none rounded-3xl flex flex-col items-center justify-center hover:bg-[#fafafa]/[0.8] transition-all w-full h-full py-7">
        <LucideUploadCloud className="w-10 h-10 mb-2" />
        <span className="text-lg font-semibold mb-3 text-[#121316]/80">
          点击或拖拽上传文档
        </span>
        <h2 className="text-black/60 text-sm font-semibold mb-3">
          支持 PDF、Word、PPT、图片等多种格式
        </h2>
        <div className="mb-2 px-4 text-center flex gap-6 flex-wrap justify-center">
          <p className="text-black/60 text-xs flex items-center">
            <span
              className="w-2 h-2 rotate-45 rounded mr-2"
              style={{ background: '#4595FF' }}
            />
            单文档 ≤ 200MB、600页
          </p>
          <p className="text-black/60 text-xs flex items-center">
            <span
              className="w-2 h-2 rotate-45 rounded mr-2"
              style={{ background: '#FF7A7A' }}
            />
            单图片 ≤ 10MB
          </p>
          <p className="text-black/60 text-xs flex items-center">
            <span
              className="w-2 h-2 rotate-45 rounded mr-2"
              style={{ background: '#FF7A7A' }}
            />
            批量上传 ≤ 20个
          </p>
        </div>
        <div className="flex gap-4 mt-4">
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              onSwitchToUrl()
            }}
            className="hover:brightness-95 cursor-pointer"
          >
            <Link className="mr-1" />
            URL 上传
          </Button>
        </div>
      </div>
    </div>
  )
}

export default FileUploader
