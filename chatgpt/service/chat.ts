
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

export async function chatCompletion(
  conversationId: string,
  payload: any,
) {
  return post<any>(`/v1/chat/completions`, { body: payload }, { returnBody: true })
}

export async function getConversationMessages(conversation_id: string, page: number = 1, limit: number = 20) {
  return get<any>(`/v1/conversation/${conversation_id}/messages`, { params: { page, limit } }, { silent: true })
}