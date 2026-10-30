import type { APIRequestContext } from '@playwright/test'

export async function apiPost<T>(
  request: APIRequestContext,
  path: string,
  data: object
): Promise<T> {
  const response = await request.post(`/api${path}`, { data })

  if (!response.ok()) {
    throw new Error(
      `POST /api${path} answered ${response.status()}: ${await response.text()}`
    )
  }

  return (await response.json()) as T
}

export async function apiGet<T>(request: APIRequestContext, path: string): Promise<T> {
  const response = await request.get(`/api${path}`)

  if (!response.ok()) {
    throw new Error(
      `GET /api${path} answered ${response.status()}: ${await response.text()}`
    )
  }

  return (await response.json()) as T
}
