import type { Env } from '../config/env.js'
import { TooManyRequestsError } from './errors.js'

/**
 * The Workers Rate Limiting binding's shape — typed structurally so the
 * typecheck needs no generated bindings to read it.
 */
export interface RateLimitBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>
}

/** The namespaces the API limits through. */
export type RateLimitNamespace = 'general' | 'credentials'

/**
 * Counts one request against a rate-limit namespace, keyed by the client's
 * address — the replacement of the `@nestjs/throttler` guard. A request
 * over the limit answers 429.
 *
 * The general namespace covers every route (300 requests a minute per
 * address — one page load fans out into several queries, and a household
 * can share an address); the credential namespace is tighter (10 a minute)
 * for sign-in, sign-up, and password resets.
 */
export async function limitRequest(
  env: Env,
  namespace: RateLimitNamespace,
  clientAddress: string
): Promise<void> {
  const binding = (
    namespace === 'general' ? env.RATE_LIMIT : env.RATE_LIMIT_CREDENTIALS
  ) as RateLimitBinding | undefined

  if (binding === undefined || clientAddress === '') {
    // No binding (a test harness without one) or no address: unlimited.
    return
  }

  const { success } = await binding.limit({ key: clientAddress })

  if (!success) {
    throw new TooManyRequestsError('Too many requests. Try again later.')
  }
}

/** The client address a request came from, for the rate limit's key. */
export function clientAddressOf(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    ''
  )
}
