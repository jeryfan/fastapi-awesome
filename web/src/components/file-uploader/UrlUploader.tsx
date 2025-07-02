import { useState } from 'react'
import { Button } from '@/components/ui/button'

const UrlUploader = ({ onCancel }: { onCancel: () => void }) => {
  const [urls, setUrls] = useState('')

  const handleSubmit = () => {
    const urlList = urls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u !== '')
    const valid = urlList.every((url) => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    })
    if (!valid) {
      alert('请检查 URL 格式是否正确')
      return
    }

    // 上传逻辑
    console.log('提交 URL:', urlList)
  }

  return (
    <div className="relative w-full h-full cursor-pointer">
      <textarea
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        placeholder="请输入一个或多个文件 URL，换行分隔"
        className="w-full h-full min-h-[16rem] resize-none overflow-x-auto border border-blue-300 bg-white rounded-[20px] p-3 text-black text-base md:text-sm shadow-none focus:outline-none"
      />
      <div className="absolute flex gap-4 bottom-3 right-3">
        <Button
          variant="secondary"
          onClick={onCancel}
          className="hover:brightness-95"
        >
          取消
        </Button>
        <Button onClick={handleSubmit} className="hover:brightness-95">
          提交
        </Button>
      </div>
    </div>
  )
}

export default UrlUploader
