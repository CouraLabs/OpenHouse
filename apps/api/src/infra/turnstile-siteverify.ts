import {
  TurnstileVerifier,
  type SiteverifyFn,
  type SiteverifyResult,
  type TurnstileConfig,
} from '@workspace/business'

const SITEVERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function createTurnstileSiteverify(
  fetcher: typeof fetch = (input, init) => fetch(input, init)
): SiteverifyFn {
  return async (secret, token, remoteIp) => {
    const form = new URLSearchParams({ secret, response: token })
    if (remoteIp !== '') {
      form.set('remoteip', remoteIp)
    }

    try {
      const response = await fetcher(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: form,
        signal: AbortSignal.timeout(10_000),
      })
      if (!response.ok) {
        return undefined
      }

      return (await response.json()) as SiteverifyResult
    } catch {
      return undefined
    }
  }
}

export function createTurnstileVerifier(
  config: TurnstileConfig | undefined,
  fetcher?: typeof fetch
): TurnstileVerifier {
  return new TurnstileVerifier(config, createTurnstileSiteverify(fetcher))
}
