import { get, post } from './base'



export async function taskCreate(fileId: string) {
  return await post('/task', {

    body: {
      file_id: fileId,
    },
  })

}

export async function taskList({ pageParam = 1 }: { pageParam?: number }) {
  return await get('/task', {
    params: {
      page: pageParam,
      size: 4,
    },
  })
}