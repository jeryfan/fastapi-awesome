import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { useResizeDetector } from 'react-resize-detector'
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PdfViewerProps {
  url: string
  className?: string
}

export default function PdfViewer({ url, className }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(0.6)

  const { ref } = useResizeDetector<HTMLDivElement>()
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Array<HTMLDivElement | null>>([])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageNumber(1)
  }

  const zoomIn = () => setScale((s) => Math.min(s + 0.2, 5.0))
  const zoomOut = () => setScale((s) => Math.max(s - 0.2, 0.2))

  const goToPage = (page: number) => {
    if (page < 1 || page > numPages) return
    setPageNumber(page)
    const target = pageRefs.current[page - 1]
    if (target && containerRef.current) {
      // 居中滚动
      const parent = containerRef.current
      const targetTop = target.offsetTop
      const centerOffset =
        targetTop - parent.clientHeight / 2 + target.clientHeight / 2
      parent.scrollTo({ top: centerOffset, behavior: 'smooth' })
    }
  }

  const goToPrevPage = () => goToPage(pageNumber - 1)
  const goToNextPage = () => goToPage(pageNumber + 1)

  // Ctrl / ⌘ + 滚轮缩放
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()

      setScale((prev) => {
        const step = 0.1
        const next = e.deltaY > 0 ? prev - step : prev + step
        return Math.max(0.2, Math.min(5.0, parseFloat(next.toFixed(2))))
      })
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  return (
    <TooltipProvider>
      <div className={cn('relative h-full w-full', className)}>
        <div
          ref={(el) => {
            ref(el)
            containerRef.current = el
          }}
          className="h-full w-full overflow-auto bg-gray-100 dark:bg-gray-900"
        >
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease',
            }}
          >
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={<div className="p-4 text-center">正在加载 PDF...</div>}
              error={
                <div className="p-4 text-center text-red-500">
                  加载 PDF 失败。
                </div>
              }
            >
              {Array.from(new Array(numPages), (_, index) => (
                <div
                  key={`page_${index + 1}`}
                  ref={(el) => (pageRefs.current[index] = el)}
                  className="flex justify-center"
                  style={{
                    margin: 0,
                    padding: 0,
                    lineHeight: 0,
                  }}
                >
                  <Page
                    pageNumber={index + 1}
                    renderTextLayer
                    renderAnnotationLayer
                  />
                </div>
              ))}
            </Document>
          </div>
        </div>

        {/* 控制工具栏 */}
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full bg-white p-2 shadow-lg dark:bg-gray-800">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevPage}
                  disabled={pageNumber <= 1}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>上一页</TooltipContent>
            </Tooltip>

            <span className="px-2 text-sm font-medium">
              {pageNumber} / {numPages || '...'}
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextPage}
                  disabled={pageNumber >= numPages}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>下一页</TooltipContent>
            </Tooltip>

            <div className="mx-2 h-6 border-l" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={zoomOut}>
                  <Minus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>缩小</TooltipContent>
            </Tooltip>

            <span className="w-16 text-center text-sm font-medium">
              {Math.round(scale * 100)}%
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={zoomIn}>
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>放大</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
