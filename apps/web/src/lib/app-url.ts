export const APP_BASE: string = import.meta.env.BASE_URL.replace(/\/$/, '')

export function appPath(path: string): string {
  return `${APP_BASE}${path}`
}

export function appUrl(path: string): string {
  return `${window.location.origin}${appPath(path)}`
}

export function routePathname(): string {
  const { pathname } = window.location

  return pathname.startsWith(APP_BASE)
    ? pathname.slice(APP_BASE.length) || '/'
    : pathname
}
