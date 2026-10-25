// The one place that talks to the API. Every call goes to /api/v1, carries the session cookie, and fails with an
// ApiError whose message is fit to show to the operator.

export class ApiError extends Error {
  status: number
  /** Machine-readable reason from the server, e.g. FORBIDDEN or RATE_LIMITED. */
  code?: string
  retryAfter?: number

  constructor(message: string, status: number, code?: string, retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

let onUnauthenticated: (() => void) | undefined

/** The auth provider registers itself here so any 401 anywhere returns the operator to the sign-in screen. */
export function setUnauthenticatedHandler(handler: (() => void) | undefined) {
  onUnauthenticated = handler
}

interface Options {
  body?: unknown
  signal?: AbortSignal
  /** For calls where a 401 is the answer to this very request (a wrong password), not a lost session. */
  answers401?: boolean
}

interface Envelope<T> {
  success: boolean
  data?: T
  code?: string
  message?: string
}

const NETWORK_MESSAGE = "Can't reach the server. Check the connection and try again."
const SERVER_MESSAGE = 'The server failed to answer this request. Check the API logs.'

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export async function request<T>(method: string, path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  let body: BodyInit | undefined

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}/api/v1${path}`, { method, headers, body, credentials: 'include', signal: options.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(NETWORK_MESSAGE, 0)
  }

  const envelope = (await response.json().catch(() => undefined)) as Envelope<T> | undefined

  if (response.ok && envelope?.success) return envelope.data as T

  if (response.status === 401 && !options.answers401) onUnauthenticated?.()

  const message = response.status >= 500 && !envelope?.message ? SERVER_MESSAGE : (envelope?.message ?? SERVER_MESSAGE)
  const retryAfter = Number(response.headers.get('Retry-After')) || undefined

  throw new ApiError(message, response.status, envelope?.code, retryAfter)
}

export const get = <T>(path: string, options?: Options) => request<T>('GET', path, options)
export const post = <T>(path: string, body?: unknown, options?: Options) => request<T>('POST', path, { ...options, body })
export const put = <T>(path: string, body?: unknown, options?: Options) => request<T>('PUT', path, { ...options, body })
export const patch = <T>(path: string, body?: unknown, options?: Options) => request<T>('PATCH', path, { ...options, body })
export const del = <T>(path: string, body?: unknown, options?: Options) => request<T>('DELETE', path, { ...options, body })

/** A message for any thrown value, for showing in an alert. */
export function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return error instanceof Error ? error.message : 'Something went wrong. Try again.'
}

/** Builds a query string from defined values only. */
export function query(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

/** Where a file download lives, for plain links (the session cookie goes along). */
export const downloadUrl = (path: string) => `${API_BASE}/api/v1${path}`
