import { House } from 'lucide-react'

/**
 * What the session gate renders while the first `/auth/me` call settles. A
 * bare `null` here reads as a broken app whenever the API is slow or offline
 * — a visible splash keeps the refresh from looking like a blank page. The
 * session query retries and times out, so this always resolves.
 */
export function SessionSplash() {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center">
      <House className="size-8 animate-pulse text-muted-foreground" />
    </div>
  )
}
