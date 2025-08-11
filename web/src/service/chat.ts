
import { del, get, post } from './base'

export async function getConversationList(page: number = 1, limit: number = 20, title?: string) {
  return get<any>('/v1/conversation', { params: { page, limit, title } }, { silent: true })
}

export async function conversationAdd() {
  return post<any>('/v1/conversation', { body: {} }, { silent: true })
}

export async function conversationDelete(conversationId: string) {
  return del<any>(`/v1/conversation/${conversationId}`, { body: {} }, { silent: true })
}