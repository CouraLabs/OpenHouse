import type { Env } from '../config/env.js'
import { TooManyRequestsError } from './errors.js'

export interface RateLimitBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>
}

export type RateLimitNamespace = 'general' | 'credentials'

export async function limitRequest(
  env: Env,
  namespace: RateLimitNamespace,
  clientAddress: string
): Promise<void> {
  const binding = (
    namespace === 'general' ? env.RATE_LIMIT : env.RATE_LIMIT_CREDENTIALS
  ) as RateLimitBinding | undefined

  if (binding === undefined || clientAddress === '') {
    return
  }

  const { success } = await binding.limit({ key: clientAddress })

  if (!success) {
    throw new TooManyRequestsError('Too many requests. Try again later.')
  }
}

export function clientAddressOf(request: Request): string {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    ''
  )
}
