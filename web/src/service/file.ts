import { post, upload } from './base'

export function uploadFile(
  file: File,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
) {
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
      signal,
    }
  )
}

export function startChunkedUpload(filename: string, totalChunks: number) {
  return post('/files/upload/start', { filename, total_chunks: totalChunks })
}

export function uploadChunk(
  uploadId: string,
  chunkNumber: number,
  chunk: Blob,
  signal: AbortSignal,
) {
  const formData = new FormData()
  formData.append('upload_id', uploadId)
  formData.append('chunk_number', String(chunkNumber))
  formData.append('chunk', chunk)

  return upload(
    {
      data: formData,
      signal,
    },
    '/files/upload/chunk',
  )
}

export function completeChunkedUpload(uploadId: string, filename: string) {
  return post('/files/upload/complete', {
    upload_id: uploadId,
    filename,
  })
}
