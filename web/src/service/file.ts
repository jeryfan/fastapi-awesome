import { upload } from './base'

export function uploadFile(file: File, onProgress: (progress: number) => void) {
  const formData = new FormData()
  formData.append('file', file)

  return upload(
    {
      data: formData,
      onprogress: (event: ProgressEvent) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100
          onProgress(percentComplete)
        }
      },
    },
    '/files/upload',
  )
}
