import { env } from 'cloudflare:workers'
import { applyDatabaseMigrations } from '../../../packages/db/test/apply-migrations.js'

await applyDatabaseMigrations(env.DB)

const realFetch = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = input instanceof Request ? input.url : String(input)

  if (url !== 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
    return realFetch(input, init)
  }

  const token =
    new URLSearchParams(String(init?.body ?? '')).get('response') ?? ''
  const [verdict, action] = token.split(':')

  return Response.json(
    verdict === 'pass'
      ? { success: true, action, hostname: 'localhost' }
      : { success: false, 'error-codes': ['invalid-input-response'] }
  )
}
