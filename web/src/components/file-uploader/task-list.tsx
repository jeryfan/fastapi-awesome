import { GitPullRequestDraft } from 'lucide-react'

const TaskList = () => {
  const tasks = []
  return (
    <div className="bg-white relative z-10 pb-4 min-w-[10rem] min-h-[6rem]">
      <h2 className="text-[1rem] font-semibold px-6 my-4">上传记录</h2>
      <div className="h-[10rem] scrollbar-thin px-4  mb-4 overflow-auto">
        {tasks.map((task) => (
          <div className="relative flex items-center overflow-x-hidden overflow-y-visible px-2 justify-start w-[16rem] h-[2.5rem] mb-3 group hover:bg-blue-hover rounded-lg group cursor-pointer transition-all duration-300 ease-out">
            <GitPullRequestDraft className="w-4 h-4" />
            <span className="block truncate overflow-hidden relative font-semibold text-ellipsis max-w-[calc(100%-4rem)] text-sm">
              xxxxx.pdf
            </span>
            <div className="flex items-center justify-center ml-auto relative top-[0.1rem] h-6 w-6">
              <span className="anticon text-[2rem] absolute inset-0 flex items-center justify-center text-[#00B365] transition-all duration-500 opacity-0 scale-75 -rotate-90">
                <GitPullRequestDraft className="w-4 h-4" />
              </span>
              <div className="absolute inset-0 flex items-center justify-center transition-all duration-300 opacity-100 scale-100"></div>
            </div>
            <div className="text-sm whitespace-nowrap"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TaskList
