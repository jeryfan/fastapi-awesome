import { createFileRoute } from '@tanstack/react-router'
import FileUploader from '@/components/file-uploader'

export const Route = createFileRoute('/upload')({
  component: UploadComponent,
})

function UploadComponent() {
  return <FileUploader />
}
