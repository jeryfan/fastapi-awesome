// src/lib/api.ts

// Define a TypeScript interface for a single task based on your JSON
export interface Task {
  file_name: string
  task_id: string
  type: string
  state: "done" | "processing" | "error" // Use union types for known states
  full_md_link: string
  err_msg: string
  created_at: number // This is a Unix timestamp in milliseconds
  model_version: string
}

// Define the structure for a single page of data
export interface PaginatedTasksResponse {
  tasks: Array<Task>
  nextCursor: number | null
}

// Let's use your provided data to create a larger mock database
const sampleTask: Task = {
  file_name: "xxx.pdf",
  task_id: "702d1c92-0af4-4567-a430-9c7b3407b240",
  type: "pdf",
  state: "done",
  full_md_link: "https://cdn-mineru.openxlab.org.cn/extract/...",
  err_msg: "",
  created_at: 1751554221028,
  model_version: "v2"
}

const allTasks: Array<Task> = Array.from({ length: 50 }, (_, i) => ({
  ...sampleTask,
  file_name: `报告文档_${i + 1}.${sampleTask.type}`,
  task_id: crypto.randomUUID(), // Generate a unique ID for each task
  created_at: Date.now() - (i * 3600000), // Simulate tasks created over time
  state: i % 10 === 0 ? "error" : "done", // Occasionally sprinkle in an error state
  err_msg: i % 10 === 0 ? "解析失败：文件已损坏" : ""
}))


// The updated fetch function
export const fetchTasks = async ({ pageParam = 0 }): Promise<PaginatedTasksResponse> => {
  console.log(`Fetching page number: ${pageParam}`)

  // Simulate network latency
  await new Promise(resolve => setTimeout(resolve, 800))

  const pageSize = 10 // The API returns 10 items per page
  const start = pageParam * pageSize
  const end = start + pageSize
  const pageTasks = allTasks.slice(start, end)

  // The backend response structure we are mimicking
  const apiResponse = {
    code: 0,
    msg: "ok",
    data: {
      list: pageTasks,
      total: allTasks.length,
    },
  }

  // Determine the next page's cursor
  const nextCursor = end < apiResponse.data.total ? pageParam + 1 : null

  // We transform the API response into the structure useInfiniteQuery needs
  return {
    tasks: apiResponse.data.list,
    nextCursor: nextCursor,
  }
}