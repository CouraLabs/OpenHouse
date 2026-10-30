import type { Env } from '../config/env.js'
import { TooManyRequestsError } from './errors.js'

export interface RateLimitBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>
}

export type RateLimitNamespace = 'general' | 'credentials' | 'email'

const bindingNames = {
  general: 'RATE_LIMIT',
  credentials: 'RATE_LIMIT_CREDENTIALS',
  email: 'RATE_LIMIT_EMAIL',
} as const

export async function limitRequest(
  env: Env,
  namespace: RateLimitNamespace,
  clientAddress: string
): Promise<void> {
  const binding = env[bindingNames[namespace]] as RateLimitBinding | undefined

  if (
    env.ENVIRONMENT === 'development' ||
    binding === undefined ||
    clientAddress === ''
  ) {
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
