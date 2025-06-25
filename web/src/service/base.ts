import { toast } from "sonner"
import { refreshAccessTokenOrRelogin } from './refresh-token'
import { API_PREFIX } from '@/config'
import { asyncRunSafe } from '@/utils'

const TIME_OUT = 100000

const ContentType = {
  json: 'application/json',
  stream: 'text/event-stream',
  audio: 'audio/mpeg',
  form: 'application/x-www-form-urlencoded; charset=UTF-8',
  download: 'application/octet-stream', // for download
  upload: 'multipart/form-data', // for upload
}

const baseOptions = {
  method: 'GET',
  mode: 'cors',
  credentials: 'include', // always send cookies、HTTP Basic authentication.
  headers: new Headers({
    'Content-Type': ContentType.json,
  }),
  redirect: 'follow',
}

export type IOnDataMoreInfo = {
  conversationId?: string
  taskId?: string
  messageId: string
  errorMessage?: string
  errorCode?: string
}

export type IOnData = (message: string, isFirstMessage: boolean, moreInfo: IOnDataMoreInfo) => void
export type IOnCompleted = (hasError?: boolean, errorMessage?: string) => void
export type IOnError = (msg: string, code?: string) => void


export type IOnTTSChunk = (messageId: string, audioStr: string, audioType?: string) => void
export type IOnTTSEnd = (messageId: string, audioStr: string, audioType?: string) => void

export type IOtherOptions = {
  bodyStringify?: boolean
  needAllResponseContent?: boolean
  deleteContentType?: boolean
  silent?: boolean
  onData?: IOnData // for stream
  onError?: IOnError
  onCompleted?: IOnCompleted // for stream
  getAbortController?: (abortController: AbortController) => void

  onTTSChunk?: IOnTTSChunk
  onTTSEnd?: IOnTTSEnd

}

type ResponseError = {
  code: string
  message: string
  status: number
}

type FetchOptionType = Omit<RequestInit, 'body'> & {
  params?: Record<string, any>
  body?: BodyInit | Record<string, any> | null
}

function unicodeToChar(text: string) {
  if (!text)
    return ''

  return text.replace(/\\u[0-9a-f]{4}/g, (_match, p1) => {
    return String.fromCharCode(parseInt(p1, 16))
  })
}

function requiredWebSSOLogin() {
  globalThis.location.href = `/webapp-signin?redirect_url=${globalThis.location.pathname}`
}

function getAccessToken() {
  return localStorage.getItem('access_token') || ''
}

function removeAccessToken() {

}

export function format(text: string) {
  let res = text.trim()
  if (res.startsWith('\n'))
    res = res.replace('\n', '')

  return res.replaceAll('\n', '<br/>').replaceAll('```', '')
}



const baseFetch = <T>(
  url: string,
  fetchOptions: FetchOptionType,
  {
    bodyStringify = true,
    needAllResponseContent,
    deleteContentType,
    getAbortController,
    silent,
  }: IOtherOptions,
): Promise<T> => {
  const options: typeof baseOptions & FetchOptionType = Object.assign({}, baseOptions, fetchOptions)
  if (getAbortController) {
    const abortController = new AbortController()
    getAbortController(abortController)
    options.signal = abortController.signal
  }
  const accessToken = getAccessToken()
  options.headers.set('Authorization', `Bearer ${accessToken}`)

  if (deleteContentType) {
    options.headers.delete('Content-Type')
  }
  else {
    const contentType = options.headers.get('Content-Type')
    if (!contentType)
      options.headers.set('Content-Type', ContentType.json)
  }

  let urlWithPrefix = (url.startsWith('http://') || url.startsWith('https://'))
    ? url
    : `${API_PREFIX}${url.startsWith('/') ? url : `/${url}`}`

  const { method, params, body } = options
  // handle query
  if (method === 'GET' && params) {
    const paramsArray: Array<string> = []
    Object.keys(params).forEach(key =>
      paramsArray.push(`${key}=${encodeURIComponent(params[key])}`),
    )
    if (urlWithPrefix.search(/\?/) === -1)
      urlWithPrefix += `?${paramsArray.join('&')}`

    else
      urlWithPrefix += `&${paramsArray.join('&')}`

    delete options.params
  }

  if (body && bodyStringify)
    options.body = JSON.stringify(body)

  // Handle timeout
  return Promise.race([
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('request timeout'))
      }, TIME_OUT)
    }),
    new Promise((resolve, reject) => {
      globalThis.fetch(urlWithPrefix, options as RequestInit)
        .then((res) => {
          const resClone = res.clone()
          // Error handler
          if (!/^(2|3)\d{2}$/.test(String(res.status))) {
            const bodyJson = res.json()
            switch (res.status) {
              case 401:
                return Promise.reject(resClone)
              case 403:
                bodyJson.then((data: ResponseError) => {
                  if (!silent)
                    toast.error(data.message)
                  if (data.code === 'already_setup')
                    globalThis.location.href = `${globalThis.location.origin}/signin`
                })
                break
              // fall through
              default:
                bodyJson.then((data: ResponseError) => {
                  if (!silent)
                    toast.error(data.message)
                })
            }
            return Promise.reject(resClone)
          }

          // handle delete api. Delete api not return content.
          if (res.status === 204) {
            resolve({ result: 'success' })
            return
          }

          // return data
          if (options.headers.get('Content-type') === ContentType.download || options.headers.get('Content-type') === ContentType.audio)
            resolve(needAllResponseContent ? resClone : res.blob())

          else resolve(needAllResponseContent ? resClone : res.json())
        })
        .catch((err) => {
          if (!silent)
            toast.error(err)
          reject(err)
        })
    }),
  ]) as Promise<T>
}

export const upload = (options: any, isPublicAPI?: boolean, url?: string, searchParams?: string): Promise<any> => {
  const urlPrefix = isPublicAPI ? PUBLIC_API_PREFIX : API_PREFIX
  const token = getAccessToken(isPublicAPI)
  const defaultOptions = {
    method: 'POST',
    url: (url ? `${urlPrefix}${url}` : `${urlPrefix}/files/upload`) + (searchParams || ''),
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {},
  }
  options = {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options.headers },
  }
  return new Promise((resolve, reject) => {
    const xhr = options.xhr
    xhr.open(options.method, options.url)
    for (const key in options.headers)
      xhr.setRequestHeader(key, options.headers[key])

    xhr.withCredentials = true
    xhr.responseType = 'json'
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 201)
          resolve(xhr.response)
        else
          reject(xhr)
      }
    }
    xhr.upload.onprogress = options.onprogress
    xhr.send(options.data)
  })
}


// base request
export const request = async<T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  try {
    const otherOptionsForBaseFetch = otherOptions || {}
    const [err, resp] = await asyncRunSafe<T>(baseFetch(url, options, otherOptionsForBaseFetch))
    if (err === null)
      return resp
    const errResp: Response = err as any
    if (errResp.status === 401) {
      const [parseErr, errRespData] = await asyncRunSafe<ResponseError>(errResp.json())
      const loginUrl = `${globalThis.location.origin}/signin`
      if (parseErr) {
        globalThis.location.href = loginUrl
        return Promise.reject(err)
      }
      // special code
      const { code, message } = errRespData
      // webapp sso
      if (code === 'web_sso_auth_required') {
        requiredWebSSOLogin()
        return Promise.reject(err)
      }
      if (code === 'unauthorized_and_force_logout') {
        localStorage.removeItem('console_token')
        localStorage.removeItem('refresh_token')
        globalThis.location.reload()
        return Promise.reject(err)
      }
      const {
        isPublicAPI = false,
        silent,
      } = otherOptionsForBaseFetch
      if (isPublicAPI && code === 'unauthorized') {
        removeAccessToken()
        globalThis.location.reload()
        return Promise.reject(err)
      }
      // refresh token
      const [refreshErr] = await asyncRunSafe(refreshAccessTokenOrRelogin(TIME_OUT))
      if (refreshErr === null)
        return baseFetch<T>(url, options, otherOptionsForBaseFetch)
      if (location.pathname !== '/signin') {
        globalThis.location.href = loginUrl
        return Promise.reject(err)
      }
      if (!silent) {
        toast.error(message)
        return Promise.reject(err)
      }
      globalThis.location.href = loginUrl
      return Promise.reject(err)
    }
    else {
      return Promise.reject(err)
    }
  }
  catch (error) {
    console.error(error)
    return Promise.reject(error)
  }
}

// request methods
export const get = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, Object.assign({}, options, { method: 'GET' }), otherOptions)
}

export const post = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, Object.assign({}, options, { method: 'POST' }), otherOptions)
}

export const put = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, Object.assign({}, options, { method: 'PUT' }), otherOptions)
}

export const del = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, Object.assign({}, options, { method: 'DELETE' }), otherOptions)
}

export const patch = <T>(url: string, options = {}, otherOptions?: IOtherOptions) => {
  return request<T>(url, Object.assign({}, options, { method: 'PATCH' }), otherOptions)
}


