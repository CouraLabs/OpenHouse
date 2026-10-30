import { useEffect, useRef } from 'react'

interface TurnstileRenderOptions {
  sitekey: string
  action: string
  theme: 'auto' | 'light' | 'dark'
  language?: string
  callback: (token: string) => void
  'expired-callback': () => void
  'error-callback': () => void
}

interface TurnstileApi {
  render(container: HTMLElement, options: TurnstileRenderOptions): string
  reset(widgetId: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let scriptLoad: Promise<TurnstileApi> | undefined

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile !== undefined) {
    return Promise.resolve(window.turnstile)
  }

  scriptLoad ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () =>
      window.turnstile === undefined
        ? reject(new Error('Turnstile did not load.'))
        : resolve(window.turnstile)
    script.onerror = () => {
      scriptLoad = undefined
      script.remove()
      reject(new Error('Turnstile did not load.'))
    }
    document.head.appendChild(script)
  })

  return scriptLoad
}

interface TurnstileWidgetProps {
  siteKey: string
  action: string
  onToken: (token: string | null) => void
  resetKey?: number
  theme?: 'auto' | 'light' | 'dark'
  language?: string
  className?: string
}

export function TurnstileWidget({
  siteKey,
  action,
  onToken,
  resetKey,
  theme = 'auto',
  language,
  className,
}: TurnstileWidgetProps) {
  const container = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | undefined>(undefined)
  const onTokenRef = useRef(onToken)

  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    let cancelled = false

    loadTurnstile()
      .then((api) => {
        if (cancelled || container.current === null) {
          return
        }

        widgetId.current = api.render(container.current, {
          sitekey: siteKey,
          action,
          theme,
          language,
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch(() => onTokenRef.current(null))

    return () => {
      cancelled = true
      if (widgetId.current !== undefined) {
        window.turnstile?.remove(widgetId.current)
        widgetId.current = undefined
      }
    }
  }, [siteKey, action, theme, language])

  useEffect(() => {
    if (resetKey === undefined || widgetId.current === undefined) {
      return
    }

    window.turnstile?.reset(widgetId.current)
    onTokenRef.current(null)
  }, [resetKey])

  return <div ref={container} className={className} />
}
