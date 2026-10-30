export const APP_PREFIX = '/app'

export function isAppPath(pathname: string): boolean {
  return pathname === APP_PREFIX || pathname.startsWith(`${APP_PREFIX}/`)
}

export async function serveApp(
  assets: Fetcher,
  request: Request
): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname.slice(APP_PREFIX.length) || '/'
  const response = await assets.fetch(
    new Request(new URL(`${path}${url.search}`, url), request)
  )
  const location = response.headers.get('location')

  if (location === null) {
    return response
  }

  const target = new URL(location, url)

  if (target.origin !== url.origin || isAppPath(target.pathname)) {
    return response
  }

  const headers = new Headers(response.headers)
  headers.set(
    'location',
    `${APP_PREFIX}${target.pathname}${target.search}${target.hash}`
  )

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
