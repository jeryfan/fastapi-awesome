import { useState } from 'react'
import UrlUploader from './UrlUploader'
import FileUploader from './FileUploader'

const Uploader = () => {
  const [mode, setMode] = useState<'file' | 'url'>('file')

  return (
    <div className="min-h-full min-w-full w-full h-full flex justify-center items-center px-4 sm:px-6 relative">
      <div className="w-full h-full flex flex-col relative justify-center items-center max-w-full sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] xl:max-w-[900px]">
        <div className="h-auto sm:h-[280px] w-full">
          {mode === 'file' ? (
            <FileUploader onSwitchToUrl={() => setMode('url')} />
          ) : (
            <UrlUploader onCancel={() => setMode('file')} />
          )}
        </div>
      </div>
    </div>
  )
}

export default Uploader
