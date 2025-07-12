// atoms/uploadingTasks.ts
import { atom } from 'jotai'

export type UploadTask = {
  id: string
  file_name: string
  file_type?: string
}

export const uploadingTasksAtom = atom<Array<UploadTask>>([])


export const addUploadTaskAtom = atom(null, (get, set, task: UploadTask) => {
  set(uploadingTasksAtom, [...get(uploadingTasksAtom), task])
})

export const removeUploadTaskAtom = atom(null, (get, set, id: string) => {
  set(
    uploadingTasksAtom,
    get(uploadingTasksAtom).filter((task) => task.id !== id)
  )
})