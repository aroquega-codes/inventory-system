const BASE = '/api'

async function request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error((err as { detail?: string }).detail || JSON.stringify(err))
  }
  if (res.status === 204) return null as T
  return res.json() as Promise<T>
}

export const api = {
  get:    <T = unknown>(path: string) => request<T>('GET', path),
  post:   <T = unknown>(path: string, body: unknown) => request<T>('POST', path, body),
  put:    <T = unknown>(path: string, body: unknown) => request<T>('PUT', path, body),
  patch:  <T = unknown>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
}
