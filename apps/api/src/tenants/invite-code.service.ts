import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { randomBytes } from 'node:crypto'
import type { Database, TenantCode } from '@workspace/db'
import { tenantCodes } from '@workspace/db'

/**
 * The length of the generated code, in characters. 24 URL-safe characters is
 * 144 bits of entropy — beyond brute force, short enough to paste.
 */
const CODE_BYTES = 18

/** What an invite code looks like to the web app: the code and when it dies. */
export interface CreatedInviteCode {
  code: string
  expiresAt: Date | null
  createdAt: Date
}

/**
 * Generates the single-use codes an owner hands out so the next users of the
 * tenant can sign up.
 */
@Injectable()
export class InviteCodeService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Creates an unused code for the tenant, expiring when `expiresAt` says. */
  async create(tenantId: number, expiresAt?: Date): Promise<CreatedInviteCode> {
    const code = randomBytes(CODE_BYTES).toString('base64url')

    const [row] = await this.db
      .insert(tenantCodes)
      .values({ tenantId, code, expiresAt: expiresAt ?? null })
      .returning()

    return this.toCreatedInviteCode(row)
  }

  /** Lists the tenant's codes, newest first, with whether they still work. */
  async list(tenantId: number): Promise<CreatedInviteCode[]> {
    const rows = await this.db.query.tenantCodes.findMany({
      where: { tenantId },
      orderBy: (codes, ops) => ops.desc(codes.createdAt),
    })

    return rows.map((row) => this.toCreatedInviteCode(row))
  }

  private toCreatedInviteCode(row: TenantCode): CreatedInviteCode {
    return {
      code: row.code,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    }
  }
}
