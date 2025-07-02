import { z } from 'zod'
import { post } from './base'

export const loginSchema = z.object({
  email: z.string().email({ message: '无效的邮箱地址' }),
  password: z.string().min(6, { message: '密码至少需要6个字符' }),
})

export const registerSchema = z.object({
  username: z.string().min(2, { message: '用户名至少需要2个字符' }),
  email: z.string().email({ message: '无效的邮箱地址' }),
  password: z.string().min(6, { message: '密码至少需要6个字符' }),
})

export type LoginPayload = z.infer<typeof loginSchema>
export type RegisterPayload = z.infer<typeof registerSchema>

export interface AuthResponse {
  access_token: string
  refresh_token: string
}

export async function login(data: LoginPayload) {
  return post<AuthResponse>('/auth/login', { body: data })
}

export async function register(data: RegisterPayload) {
  return post('/auth/register', { body: data })
}

export async function logout() {
  return post('/auth/logout')
}
