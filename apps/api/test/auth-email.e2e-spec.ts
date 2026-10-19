import { randomUUID } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import type { INestApplication } from '@nestjs/common'
import { getDrizzleToken } from '@nestjs/drizzle'
import type { Database } from '@workspace/db'
import { sql } from 'drizzle-orm'
import request from 'supertest'
import type { App } from 'supertest/types.js'

import { signUp, startApp, uniqueEmail } from './support.js'

describe('one email is one user (e2e, #16)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('signs in with any casing of the email it signed up with', async () => {
    const email = uniqueEmail()
    await signUp(app, email)

    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send({ email: `  ${email.toUpperCase()} `, password: 'password-a' })
      .expect(200)
  })

  it('stores the email lowercased and trimmed', async () => {
    const email = uniqueEmail()
    const agent = await signUp(app, ` ${email.replace('user', 'User')}`)

    const me = await agent.get('/auth/me').expect(200)

    expect(me.body.user.email).toBe(email)
  })

  it('rejects a second sign-up with the same email in another tenant', async () => {
    const email = uniqueEmail()
    await signUp(app, email)

    const response = await request(app.getHttpServer())
      .post('/auth/sign-up')
      .send({
        tenantName: `t-${randomUUID()}`,
        name: 'Ana',
        email: email.toUpperCase(),
        password: 'password-b',
      })
      .expect(409)

    expect(response.body.message).toBe('This email already has an account.')
  })
})

describe('the users-email-globally-unique migration (e2e, #16)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    app = await startApp()
  })

  afterAll(async () => {
    await app.close()
  })

  /** The duplicate check the migration runs before touching any row. */
  const duplicateCheck = (): string => {
    const drizzle = new URL('../../../packages/db/drizzle/', import.meta.url)
    const folder = readdirSync(drizzle).find((name) =>
      name.endsWith('_users-email-globally-unique')
    )
    const migration = readFileSync(
      new URL(`${folder}/migration.sql`, drizzle),
      'utf8'
    )

    return migration.split('--> statement-breakpoint')[0]
  }

  /**
   * Runs the check against a scratch temp `users` table — it shadows the
   * real one inside the session and drops itself when the transaction ends —
   * and answers the error the check raised, if any.
   */
  const runCheck = async (emails: string[]): Promise<string | undefined> => {
    const db = app.get<Database>(getDrizzleToken())

    try {
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`create temp table users (id int, email text) on commit drop`
        )
        for (const [index, email] of emails.entries()) {
          await tx.execute(
            sql`insert into users values (${index + 1}, ${email})`
          )
        }
        await tx.execute(sql.raw(duplicateCheck()))
      })

      return undefined
    } catch (error) {
      const cause = (error as { cause?: Error }).cause

      return (cause ?? (error as Error)).message
    }
  }

  it('refuses to run, listing the rows, when two users share an email', async () => {
    const raised = await runCheck([
      'ana@example.com',
      ' Ana@Example.com',
      'bia@example.com',
    ])

    expect(raised).toMatch(/ana@example\.com \(user ids 1, 2\)/)
  })

  it('runs when every email is distinct', async () => {
    expect(
      await runCheck(['ana@example.com', 'bia@example.com'])
    ).toBeUndefined()
  })
})
