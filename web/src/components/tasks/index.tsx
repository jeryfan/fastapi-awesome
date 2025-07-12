import {
  AlertCircle,
  FileCheck2,
  FilterIcon,
  Trash2,
  UploadIcon,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Badge } from '@/components/ui/badge'

const mockData = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  name: '孝经.一卷.唐.唐玄宗李隆基.注.元相台岳氏荥家塾刊本.中国国家图书馆藏.pdf',
  createdAt: '2025/07/06 13:3' + i,
  status: '解析成功',
  type: 'pdf',
}))

const Tasks = () => {
  return (
    <div className="relative flex-1 h-full px-6 py-5">
      <div className="flex items-center justify-between mt-2">
        <Button className="px-3 h-9 text-white text-sm rounded-lg ">
          <UploadIcon className="w-4 h-4 mr-2" />
          上传任务
        </Button>
        <div className="w-[16rem] ml-auto mr-4 relative">
          <div className="relative w-full h-10">
            <Input placeholder="请输入文件名称" className="h-full" />
          </div>
        </div>
      </div>
      <div className="flex items-center px-1 mt-6 mb-4 whitespace-nowrap">
        <div className="mr-auto font-semibold cursor-pointer">文件列表</div>
        <div className="flex items-center hover-transition relative rounded-md cursor-pointer max-w-min whitespace-nowrap bg-blue hover:bg-blue-hover px-3 py-1 mr-2 gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button>
                <FilterIcon />
                筛选
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 overflow-auto"
              side="bottom"
              align="end"
              sideOffset={4}
            ></PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60%]">文件名称</TableHead>
              <TableHead className="w-[10%]">状态</TableHead>
              <TableHead className="w-[20%]">创建时间</TableHead>
              <TableHead className="w-[10%] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockData.map((file) => (
              <TableRow key={file.id}>
                <TableCell className="flex items-center gap-2">
                  <img src="/pdf-icon.svg" className="w-5 h-5" alt="PDF" />
                  <span className="truncate max-w-[28rem]">{file.name}</span>
                  <Badge
                    variant="outline"
                    className="ml-2 text-xs text-purple-600 border border-purple-200 bg-purple-50"
                  >
                    MinerU VLM
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center text-green-600 gap-1">
                    <FileCheck2 className="w-4 h-4" />
                    {file.status}
                  </div>
                </TableCell>
                <TableCell>{file.createdAt}</TableCell>
                <TableCell className="text-right">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48">
                      <div>
                        <h4 className="mb-2 font-medium flex items-center">
                          <AlertCircle className="border-none bg-amber-400 text-white rounded-full w-5 h-5 mr-2 mb-1.5 text-lg relative top-[0.2rem] left-[0.25rem]" />
                          是否删除该任务？
                        </h4>

                        <div className="flex justify-end gap-2">
                          <Button className="rounded " variant={'outline'}>
                            取消
                          </Button>
                          <Button className="text-white rounded bg-red-500">
                            确定
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination Section */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">共 40 项</div>

          <div className="flex items-center gap-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious />
                </PaginationItem>
                <PaginationItem>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary font-bold"
                  >
                    1
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <Button variant="ghost" size="sm">
                    2
                  </Button>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <Select>
              <SelectTrigger className="w-[100px] h-8 text-sm">
                <SelectValue placeholder="20 条/页" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 条/页</SelectItem>
                <SelectItem value="20">20 条/页</SelectItem>
                <SelectItem value="50">50 条/页</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm flex items-center gap-1">
              跳至
              <input
                type="number"
                className="w-12 border rounded px-1 py-0.5 text-sm text-center"
                min={1}
                max={2}
              />
              页
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Tasks
