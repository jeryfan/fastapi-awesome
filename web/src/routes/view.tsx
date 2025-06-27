import { createFileRoute } from '@tanstack/react-router'
import PdfViewer from '@/components/pdfView'

export const Route = createFileRoute('/view')({
  component: RouteComponent,
})

function RouteComponent() {
  return <PdfViewer url="/xxx.pdf" />
}
