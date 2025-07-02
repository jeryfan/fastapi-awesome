import { useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import { Link, LucideUploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'

const acceptedFileTypes = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc', '.docx'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'application/vnd.ms-powerpoint': ['.ppt', '.pptx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [
    '.pptx',
  ],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
}

const FileUploader = ({ onSwitchToUrl }: { onSwitchToUrl: () => void }) => {
  const onDrop = useCallback((acceptedFiles: Array<File>) => {
    console.log('拖拽或选择的文件:', acceptedFiles)
    // TODO: 这里处理上传逻辑
  }, [])

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
