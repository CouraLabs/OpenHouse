import { randomUUID } from 'node:crypto'
import { createApp } from '../src/app.js'
import { resetConfigCache } from '../src/config/env.js'
import type { Hono } from 'hono'
import type { AppEnv } from '../src/common/context.js'
import { createExecutionContext } from 'cloudflare:test'
import { env } from 'cloudflare:workers'

/**
 * The e2e harness: boots the real Hono app against the test isolate's D1
 * and drives it with requests that carry the session cookies — the
 * replacement of the supertest agent.
 */

/** The app under test, built once per file from the isolate's bindings. */
export type TestApp = Hono<AppEnv> & { bindings: AppEnv['Bindings'] }

/** A signed-in client: requests carry the session cookies sign-up set. */
export interface Agent {
  request(
    path: string,
    init?: { method?: string; body?: unknown; raw?: RequestInit }
  ): Promise<{ status: number; body: any; headers: Headers }>
  get(path: string): Promise<{ status: number; body: any; headers: Headers }>
  post(
    path: string,
    body?: unknown
  ): Promise<{ status: number; body: any; headers: Headers }>
  put(
    path: string,
    body?: unknown
  ): Promise<{ status: number; body: any; headers: Headers }>
  patch(
    path: string,
    body?: unknown
  ): Promise<{ status: number; body: any; headers: Headers }>
  delete(path: string): Promise<{ status: number; body: any; headers: Headers }>
  /** Sends a multipart form — a file upload. The fetch body serializes
   * the FormData itself, boundary and field types included. */
  form(
    path: string,
    formData: FormData
  ): Promise<{ status: number; body: any; headers: Headers }>
}

/** Boots the whole app the Worker serves — what a request sees. The
 * bindings are read once into a plain copy, and every request dispatches
 * with the same copy — the shape the Worker's own fetch hands the app. */
export function startApp(overrides: Partial<AppEnv['Bindings']> = {}): {
  app: TestApp
  bindings: AppEnv['Bindings']
} {
  const source = env as unknown as Record<string, unknown>
  const bindings = {
    DB: source.DB,
    JOBS: source.JOBS,
    RATE_LIMIT: source.RATE_LIMIT,
    RATE_LIMIT_CREDENTIALS: source.RATE_LIMIT_CREDENTIALS,
    RATE_LIMIT_EMAIL: source.RATE_LIMIT_EMAIL,
    ENVIRONMENT: source.ENVIRONMENT,
    OPENHOUSE_ENABLE_EMAIL_VERIFICATION:
      source.OPENHOUSE_ENABLE_EMAIL_VERIFICATION,
    OPENHOUSE_ENABLE_CAPTCHA_CHECK: source.OPENHOUSE_ENABLE_CAPTCHA_CHECK,
    TURNSTILE_SECRET: source.TURNSTILE_SECRET,
    TURNSTILE_SITE_KEY: source.TURNSTILE_SITE_KEY,
    TURNSTILE_HOSTNAMES: source.TURNSTILE_HOSTNAMES,
    APP_URL: source.APP_URL,
    EMAIL: { send: async (message: SentMail) => void outbox.push(message) },
    JWT_SECRET: source.JWT_SECRET,
    ...overrides,
  } as unknown as AppEnv['Bindings']

  resetConfigCache()
  const app = createApp(bindings).app as TestApp
  app.bindings = bindings

  return { app, bindings }
}

/** A message the app handed to the EMAIL binding. */
export interface SentMail {
  from: { email: string; name?: string }
  to: string
  subject: string
  text: string
  html: string
}

/** Every message the app sent in this test file, oldest first. */
export const outbox: SentMail[] = []

/** The messages sent to one address. */
export function mailTo(email: string): SentMail[] {
  const address = email.trim().toLowerCase()

  return outbox.filter((message) => message.to === address)
}

/** The token of the latest confirmation link sent to an address. */
export function verificationTokenFor(email: string): string {
  const latest = mailTo(email).at(-1)
  const match = latest?.text.match(/verify-email\?token=([^\s]+)/)
  if (match === undefined || match === null) {
    throw new Error(`no confirmation link was sent to ${email}`)
  }

  return decodeURIComponent(match[1])
}

/** Confirms an address through its latest link; the agent is signed in. */
export async function confirmEmail(
  agent: Agent,
  email: string
): Promise<{ status: number; body: any; headers: Headers }> {
  const confirmed = await agent.post('/api/auth/email/verify', {
    token: verificationTokenFor(email),
  })
  if (confirmed.status !== 200) {
    throw new Error(
      `email confirmation failed: ${confirmed.status} ${JSON.stringify(confirmed.body)}`
    )
  }

  return confirmed
}

/** A solved bot check for one action (the setup file answers siteverify). */
export function turnstileToken(action: string): string {
  return `pass:${action}`
}

/** A fresh email no other run used. */
export function uniqueEmail(): string {
  return `user-${randomUUID()}@example.com`
}

/** The agent of one browser: carries the cookies the responses set. */
function agentOf(app: TestApp, cookieJar: { value: string }): Agent {
  async function send(
    path: string,
    init: RequestInit = {}
  ): Promise<{ status: number; body: any; headers: Headers }> {
    const envAtFetch = env as unknown as AppEnv['Bindings']
    if (envAtFetch === undefined) {
      throw new Error(`SUPPORTPROBE env at fetch is undefined for ${path}`)
    }

    const response = await app.fetch(
      new Request(`http://localhost${path}`, {
        ...init,
        headers: new Headers({
          ...(init.headers ?? {}),
          origin: 'http://localhost',
          ...(cookieJar.value === '' ? {} : { cookie: cookieJar.value }),
        }),
        redirect: 'manual',
      }),
      (app as { bindings: AppEnv['Bindings'] }).bindings,
      createExecutionContext()
    )

    // Collect every Set-Cookie the response asked for — the token pair of
    // a sign-in, or the cleared cookies of a sign-out.
    const setCookies = response.headers.getSetCookie?.() ?? []
    for (const setCookie of setCookies) {
      const [pair] = setCookie.split(';')
      const [name, value] = pair.split('=')
      const expired = /expires=Thu, 01 Jan 1970|max-age=0/i.test(setCookie)

      const others = cookieJar.value
        .split('; ')
        .filter((cookie) => cookie !== '' && !cookie.startsWith(`${name}=`))

      cookieJar.value = expired
        ? others.join('; ')
        : [...others, `${name}=${value}`].join('; ')
    }

    let body: unknown = null
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      body = await response.json()
    } else if (contentType === '' || contentType.startsWith('text/')) {
      const text = await response.text()
      body = text === '' ? null : text
    } else {
      // A binary body — a ZIP download — rides as the bytes themselves.
      body = new Uint8Array(await response.arrayBuffer())
    }

    return { status: response.status, body, headers: response.headers }
  }

  const request = (
    path: string,
    init: { method?: string; body?: unknown } = {}
  ) =>
    send(path, {
      method: init.method ?? 'POST',
      ...(init.body === undefined
        ? {}
        : {
            body: JSON.stringify(init.body),
            headers: { 'content-type': 'application/json' },
          }),
    })

  return {
    request,
    get: (path) => send(path, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body }),
    put: (path, body) => request(path, { method: 'PUT', body }),
    patch: (path, body) => request(path, { method: 'PATCH', body }),
    delete: (path) => send(path, { method: 'DELETE' }),
    form: (path, formData) =>
      send(path, {
        method: 'POST',
        body: formData as unknown as RequestInit['body'],
      }),
  }
}

/** Signs up a new tenant with its owner, confirms the email, and answers
 * the signed-in agent. */
export async function signUp(
  app: TestApp,
  email = uniqueEmail(),
  password = 'password-a'
): Promise<Agent> {
  const jar = { value: '' }
  const agent = agentOf(app, jar)

  const created = await agent.post('/api/auth/sign-up', {
    tenantName: `t-${randomUUID()}`,
    name: 'Ana',
    email,
    password,
    turnstileToken: turnstileToken('signup'),
  })
  if (created.status !== 201) {
    throw new Error(
      `sign-up failed: ${created.status} ${JSON.stringify(created.body)}`
    )
  }

  await confirmEmail(agent, email)

  return agent
}

/** Creates a Checking account and answers its id. */
export async function createAccount(
  agent: Agent,
  overrides: Record<string, unknown> = {}
): Promise<number> {
  const response = await agent.post('/api/accounts', {
    name: `acc-${randomUUID()}`,
    agency: '0001',
    number: '12345',
    type: 'Checking',
    balance: '1000.00',
    currency: 'USD',
    ...overrides,
  })
  if (response.status !== 201) {
    throw new Error(
      `create account failed: ${response.status} ${JSON.stringify(response.body)}`
    )
  }

  return response.body.id
}

/** Creates a category and answers its id. */
export async function createCategory(agent: Agent): Promise<number> {
  const response = await agent.post('/api/categories', {
    name: `cat-${randomUUID()}`,
    color: '#1D4ED8',
  })
  if (response.status !== 201) {
    throw new Error(
      `create category failed: ${response.status} ${JSON.stringify(response.body)}`
    )
  }

  return response.body.id
}

/** Reads an account's current balance. */
export async function balanceOf(agent: Agent, id: number): Promise<string> {
  const response = await agent.get(`/api/accounts/${id}`)
  if (response.status !== 200) {
    throw new Error(
      `read account failed: ${response.status} ${JSON.stringify(response.body)}`
    )
  }

  return response.body.balance
}

/** Signs a member up into the owner's tenant and answers their agent. */
export async function joinAsMember(
  app: TestApp,
  owner: Agent,
  email = uniqueEmail()
): Promise<{ agent: Agent; id: number; email: string }> {
  const invite = await owner.post('/api/tenants/invite-codes', {
    expiresInDays: 7,
    turnstileToken: turnstileToken('invite'),
  })
  if (invite.status !== 201) {
    throw new Error(
      `invite failed: ${invite.status} ${JSON.stringify(invite.body)}`
    )
  }

  const jar = { value: '' }
  const agent = agentOf(app, jar)
  const joined = await agent.post('/api/auth/sign-up', {
    tenantCode: invite.body.code,
    name: 'Bia',
    email,
    password: 'password-m',
    turnstileToken: turnstileToken('signup'),
  })
  if (joined.status !== 201) {
    throw new Error(
      `member sign-up failed: ${joined.status} ${JSON.stringify(joined.body)}`
    )
  }

  const confirmed = await confirmEmail(agent, email)

  return { agent, id: confirmed.body.user.id, email }
}
