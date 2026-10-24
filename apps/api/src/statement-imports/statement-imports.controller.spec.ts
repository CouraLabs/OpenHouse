import {
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
} from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { Test } from '@nestjs/testing'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IMPORT_COMMIT_MAX_BYTES, IMPORT_MAX_BYTES } from '@workspace/poco'

import { ImportCommitService } from './import-commit.service.js'
import { ImportPreviewService } from './import-preview.service.js'
import {
  COMMIT_THROTTLE,
  PREVIEW_THROTTLE,
  StatementImportsController,
} from './statement-imports.controller.js'

/** Stands in for the session guard: every request is signed in. */
class SignedIn implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    context.switchToHttp().getRequest().session = {
      tenant: { id: 1 },
      user: { id: 2 },
    }

    return true
  }
}

async function start(): Promise<{
  app: INestApplication
  preview: ReturnType<typeof vi.fn>
  commit: ReturnType<typeof vi.fn>
}> {
  const preview = vi.fn(async () => ({ rows: [] }))
  const commit = vi.fn(async () => ({ imported: 1 }))
  const moduleRef = await Test.createTestingModule({
    // The limits enforced, as they are in production.
    imports: [
      ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 300 }] }),
    ],
    controllers: [StatementImportsController],
    providers: [
      { provide: ImportPreviewService, useValue: { preview } },
      { provide: ImportCommitService, useValue: { commit } },
      { provide: APP_GUARD, useClass: ThrottlerGuard },
      { provide: APP_GUARD, useClass: SignedIn },
    ],
  }).compile()
  const app = moduleRef.createNestApplication<NestExpressApplication>()

  // As `main.ts` does: 5,000 rows are about 1 MB of JSON.
  // biome-ignore lint/correctness/useHookAtTopLevel: a Nest method, not a React hook
  app.useBodyParser('json', { limit: IMPORT_COMMIT_MAX_BYTES })

  await app.init()

  return { app, preview, commit }
}

describe('StatementImportsController', () => {
  let app: INestApplication | undefined

  afterEach(async () => {
    await app?.close()
  })

  it('declares tighter throttles than the global limit on the heavy routes', () => {
    expect(PREVIEW_THROTTLE.default.limit).toBeLessThan(300)
    expect(COMMIT_THROTTLE.default.limit).toBeLessThanOrEqual(
      PREVIEW_THROTTLE.default.limit
    )
  })

  it('rate-limits the preview route', async () => {
    const started = await start()
    app = started.app

    const server = started.app.getHttpServer()
    const send = () =>
      request(server)
        .post('/imports/preview')
        .field('accountId', '1')
        .attach('file', Buffer.from('<OFX></OFX>'), 'a.ofx')

    for (let attempt = 0; attempt < PREVIEW_THROTTLE.default.limit; attempt++) {
      await send().expect(201)
    }

    await send().expect(429)
    expect(started.preview).toHaveBeenCalledTimes(
      PREVIEW_THROTTLE.default.limit
    )
  })

  it('rate-limits the commit route', async () => {
    const started = await start()
    app = started.app
    const rows = [
      {
        name: 'A',
        amount: '1.00',
        type: 'Expense',
        transactionDt: '2026-01-05',
        categoryId: 1,
        status: 'Checked',
      },
    ]
    const server = started.app.getHttpServer()
    const send = () =>
      request(server).post('/imports/commit').send({ accountId: 1, rows })

    for (let attempt = 0; attempt < COMMIT_THROTTLE.default.limit; attempt++) {
      await send().expect(201)
    }

    await send().expect(429)
  })

  it('refuses a file over 5 MB with 413 before the service sees it', async () => {
    const started = await start()
    app = started.app

    await request(app.getHttpServer())
      .post('/imports/preview')
      .field('accountId', '1')
      .attach('file', Buffer.alloc(IMPORT_MAX_BYTES + 1, 'a'), 'big.csv')
      .expect(413)
    expect(started.preview).not.toHaveBeenCalled()
  })

  it('refuses a preview with no file or a bad field', async () => {
    const started = await start()
    app = started.app

    await request(app.getHttpServer())
      .post('/imports/preview')
      .field('accountId', '1')
      .expect(400)
    await request(app.getHttpServer())
      .post('/imports/preview')
      .field('accountId', 'x')
      .attach('file', Buffer.from('a'), 'a.csv')
      .expect(400)
  })

  it('refuses a commit past 5,000 rows', async () => {
    const started = await start()
    app = started.app
    const row = {
      name: 'A',
      amount: '1.00',
      type: 'Expense',
      transactionDt: '2026-01-05',
      categoryId: 1,
      status: 'Checked',
    }

    await request(app.getHttpServer())
      .post('/imports/commit')
      .send({ accountId: 1, rows: Array.from({ length: 5001 }, () => row) })
      .expect(400)
    expect(started.commit).not.toHaveBeenCalled()
  })
})
