import { and, desc, eq } from 'drizzle-orm'
import { type Database, type TenantCode, tenantCodes } from '@workspace/db'
import type { InviteCode } from '@workspace/dto'

import { ConflictError, NotFoundError } from '../errors.js'
import type { Clock } from '../ports/clock.js'

const CODE_BYTES = 18

const DAY_MS = 24 * 60 * 60 * 1000

function randomCode(bytes: number): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes))
  let binary = ''
  for (const byte of raw) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

export function toWireInviteCode(row: TenantCode): InviteCode {
  return {
    id: row.id,
    code: row.code,
    usedAt: row.usedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

export class InviteCodeService {
  constructor(
    private readonly db: Database,
    private readonly clock: Clock
  ) {}

  async create(tenantId: number, expiresInDays?: number): Promise<TenantCode> {
    const code = randomCode(CODE_BYTES)
    const expiresAt =
      expiresInDays === undefined
        ? null
        : new Date(this.clock.now().getTime() + expiresInDays * DAY_MS)

    const [row] = await this.db
      .insert(tenantCodes)
      .values({ tenantId, code, expiresAt })
      .returning()

    return row
  }

  async list(tenantId: number): Promise<TenantCode[]> {
    return this.db
      .select()
      .from(tenantCodes)
      .where(eq(tenantCodes.tenantId, tenantId))
      .orderBy(desc(tenantCodes.createdAt))
  }

  async revoke(tenantId: number, id: number): Promise<void> {
    const [row] = await this.db
      .select()
      .from(tenantCodes)
      .where(and(eq(tenantCodes.tenantId, tenantId), eq(tenantCodes.id, id)))
    if (row === undefined) {
      throw new NotFoundError('Invite code not found.')
    }
    if (row.usedAt !== null) {
      throw new ConflictError('This invite code was already used.')
    }

    const now = this.clock.now()
    if (row.expiresAt !== null && row.expiresAt <= now) {
      return
    }

    await this.db
      .update(tenantCodes)
      .set({ expiresAt: now })
      .where(eq(tenantCodes.id, id))
  }
}
