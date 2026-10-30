export const ACCESS_COOKIE = 'openhouse_access'

export const REFRESH_COOKIE = 'openhouse_refresh'

export function baseCookieOptions(requestUrl: string) {
  return {
    httpOnly: true,
    sameSite: 'Lax' as const,
    secure: requestUrl.startsWith('https://'),
    path: '/',
  }
}
