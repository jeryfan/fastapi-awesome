// 导入
import { toast } from 'sonner'
import { refreshAccessTokenOrRelogin } from './refresh-token'
import type { ApiResponse } from '@/types/api'
import { API_PREFIX } from '@/config'
import { asyncRunSafe } from '@/utils'

const TIME_OUT = 100000

const ContentType = {
  json: 'application/json',
  stream: 'text/event-stream',
  audio: 'audio/mpeg',
  form: 'application/x-www-form-urlencoded; charset=UTF-8',
  download: 'application/octet-stream',
  upload: 'multipart/form-data',
}

const baseOptions = {
  method: 'GET',
  mode: 'cors',
  credentials: 'include',
  headers: new Headers({
    'Content-Type': ContentType.json,
  }),
  redirect: 'follow',
}

export type IOnCompleted = (hasError?: boolean, errorMessage?: string) => void
export type IOnError = (msg: string, code?: string) => void
export type IOnTTSChunk = (messageId: string, audioStr: string, audioType?: string) => void
export type IOnTTSEnd = (messageId: string, audioStr: string, audioType?: string) => void

export type IOtherOptions = {
  bodyStringify?: boolean
  needAllResponseContent?: boolean
  deleteContentType?: boolean
  silent?: boolean
  onError?: IOnError
  onCompleted?: IOnCompleted
  getAbortController?: (abortController: AbortController) => void
  onTTSChunk?: IOnTTSChunk
  onTTSEnd?: IOnTTSEnd
}

type FetchOptionType = Omit<RequestInit, 'body'> & {
  params?: Record<string, any>
  body?: BodyInit | Record<string, any> | null
}

function getAccessToken() {
  return localStorage.getItem('access_token') || ''
}

function removeAccessToken() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

function buildQueryParams(params: Record<string, any>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
}

export function format(text: string) {
  return text.trim().replaceAll('\n', '<br/>').replaceAll('```', '')
}

const baseFetch = async <T>(
  url: string,
  fetchOptions: FetchOptionType,
  {
    bodyStringify = true,
    needAllResponseContent,
    deleteContentType,
    getAbortController,
    silent,
  }: IOtherOptions = {}
): Promise<ApiResponse<T>> => {
  const options: typeof baseOptions & FetchOptionType = Object.assign({}, baseOptions, fetchOptions)
  const accessToken = getAccessToken()

  if (getAbortController) {
    const abortController = new AbortController()
    getAbortController(abortController)
    options.signal = abortController.signal
  }

  options.headers.set('Authorization', `Bearer ${accessToken}`)

  if (deleteContentType) {
    options.headers.delete('Content-Type')
  } else if (!options.headers.get('Content-Type')) {
    options.headers.set('Content-Type', ContentType.json)
  }

  let urlWithPrefix = /^https?:\/\//.test(url) ? url : `${API_PREFIX}${url.startsWith('/') ? url : `/${url}`}`

  const { method, params, body } = options

  if (method === 'GET' && params) {
    const query = buildQueryParams(params)
    urlWithPrefix += urlWithPrefix.includes('?') ? `&${query}` : `?${query}`
    delete options.params
  }

  // body处理
  if (body && method !== 'GET') {
    const contentType = options.headers.get('Content-Type')
    if (body instanceof FormData || body instanceof Blob) {
      options.body = body as BodyInit
    } else if (bodyStringify && contentType?.includes('application/json')) {
      options.body = JSON.stringify(body)
    } else if (contentType?.includes('x-www-form-urlencoded')) {
      options.body = buildQueryParams(body as Record<string, any>)
    }
  }

  try {
    const response = await Promise.race([
      fetch(urlWithPrefix, options as RequestInit),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('请求超时')), TIME_OUT)),
    ])

    const responseData: ApiResponse<T> = await response.json()

    console.log(responseData, 2332)

    if (responseData.code !== 200) {
      if (!silent) toast.error(responseData.msg || '请求失败')

      // if (responseData.code === 401) {
      //   const [refreshErr] = await asyncRunSafe(refreshAccessTokenOrRelogin(TIME_OUT))
      //   if (!refreshErr) {
      //     return baseFetch<T>(url, fetchOptions, {
      //       bodyStringify,
      //       needAllResponseContent,
      //       deleteContentType,
      //       getAbortController,
      //       silent,
      //     })
      //   } else {
      //     if (location.pathname !== '/login') globalThis.location.href = '/login'
      //   }
      // } else if (responseData.code === 403 && responseData.msg === 'already_setup') {
      //   globalThis.location.href = `${globalThis.location.origin}/signin`
      // }

      throw new Error(responseData.msg || '请求失败')
    }

    return responseData
  } catch (error: any) {
    console.error('Fetch error:', error)
    if (!silent) toast.error(error.message || '网络请求失败')
    throw error
  }
}

export const upload = (options: any, url?: string, searchParams?: string): Promise<any> => {
  const token = getAccessToken()
  const fullUrl = `${API_PREFIX}${url || '/files/upload'}${searchParams || ''}`
  const xhr = options?.xhr || new XMLHttpRequest()

  return new Promise((resolve, reject) => {
    xhr.open('POST', fullUrl)
    xhr.withCredentials = true
    xhr.responseType = 'json'
    xhr.upload.onprogress = options.onprogress

    const headers = {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    }
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v as string))

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 201 || xhr.status === 200) resolve(xhr.response)
        else reject(xhr)
      }
    }

    xhr.send(options.data)
  })
}

// 通用请求封装
export const request = async <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  try {
    const resp = await baseFetch<T>(url, options, otherOptions || {})
    return resp.data as T
  } catch (error) {
    console.error(error)
    throw error
  }
}

// 方法快捷调用
export const get = <T>(url: string, options = {}, otherOptions?: IOtherOptions) =>
  request<T>(url, { ...options, method: 'GET' }, otherOptions)

export const post = <T>(url: string, options = {}, otherOptions?: IOtherOptions) =>
  request<T>(url, { ...options, method: 'POST' }, otherOptions)

export const put = <T>(url: string, options = {}, otherOptions?: IOtherOptions) =>
  request<T>(url, { ...options, method: 'PUT' }, otherOptions)

export const del = <T>(url: string, options = {}, otherOptions?: IOtherOptions) =>
  request<T>(url, { ...options, method: 'DELETE' }, otherOptions)

export const patch = <T>(url: string, options = {}, otherOptions?: IOtherOptions) =>
  request<T>(url, { ...options, method: 'PATCH' }, otherOptions)