export const ACCESS_COOKIE = 'kantim_access'

export const REFRESH_COOKIE = 'kantim_refresh'

export function baseCookieOptions(requestUrl: string) {
  return {
    httpOnly: true,
    sameSite: 'Lax' as const,
    secure: requestUrl.startsWith('https://'),
    path: '/',
  }
}
