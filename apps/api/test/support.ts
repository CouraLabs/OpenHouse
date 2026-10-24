import { randomUUID } from 'node:crypto'
import type { INestApplication } from '@nestjs/common'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import { IMPORT_COMMIT_MAX_BYTES } from '@workspace/poco'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import type { App } from 'supertest/types.js'

import { AppModule } from './../src/app.module.js'

/** A signed-in client: requests carry the session cookies sign-up set. */
export type Agent = ReturnType<typeof request.agent>

/** Boots the whole API the way `main.ts` does — what a request sees. */
export async function startApp(): Promise<INestApplication<App>> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile()

  const app = moduleFixture.createNestApplication<NestExpressApplication>()
  // biome-ignore lint/correctness/useHookAtTopLevel: a Nest method, not a React hook
  app.useBodyParser('json', { limit: IMPORT_COMMIT_MAX_BYTES })
  app.use(cookieParser())
  await app.init()

  return app
}

/** A fresh email no other run used. */
export function uniqueEmail(): string {
  return `user-${randomUUID()}@example.com`
}

/** Signs up a new tenant with its owner and answers the signed-in agent. */
export async function signUp(
  app: INestApplication<App>,
  email = uniqueEmail(),
  password = 'password-a'
): Promise<Agent> {
  const agent = request.agent(app.getHttpServer())

  await agent
    .post('/auth/sign-up')
    .send({ tenantName: `t-${randomUUID()}`, name: 'Ana', email, password })
    .expect(201)

  return agent
}

/** Creates a Checking account and answers its id. */
export async function createAccount(
  agent: Agent,
  overrides: Record<string, unknown> = {}
): Promise<number> {
  const response = await agent
    .post('/accounts')
    .send({
      name: `acc-${randomUUID()}`,
      agency: '0001',
      number: '12345',
      type: 'Checking',
      balance: '1000.00',
      currency: 'USD',
      ...overrides,
    })
    .expect(201)

  return response.body.id
}

/** Creates a category and answers its id. */
export async function createCategory(agent: Agent): Promise<number> {
  const response = await agent
    .post('/categories')
    .send({ name: `cat-${randomUUID()}`, color: '#1D4ED8' })
    .expect(201)

  return response.body.id
}

/** Reads an account's current balance. */
export async function balanceOf(agent: Agent, id: number): Promise<string> {
  const response = await agent.get(`/accounts/${id}`).expect(200)

  return response.body.balance
}

/** Signs a member up into the owner's tenant and answers their agent. */
export async function joinAsMember(
  app: INestApplication<App>,
  owner: Agent,
  email = uniqueEmail()
): Promise<{ agent: Agent; id: number; email: string }> {
  const invite = await owner
    .post('/tenants/invite-codes')
    .send({ expiresInDays: 7 })
    .expect(201)
  const agent = request.agent(app.getHttpServer())
  const joined = await agent
    .post('/auth/sign-up')
    .send({
      tenantCode: invite.body.code,
      name: 'Bia',
      email,
      password: 'password-m',
    })
    .expect(201)

  return { agent, id: joined.body.user.id, email }
}
