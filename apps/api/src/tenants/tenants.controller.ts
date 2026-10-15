import { Body, Controller, Get, Post } from '@nestjs/common'
import type { Session } from '../common/session/session.js'
import { CurrentSession, Roles } from '../common/session/session.js'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import {
  createInviteCodeSchema,
  type CreateInviteCodeBody,
  type InviteCode,
} from '@workspace/poco'
import { InviteCodeService } from './invite-code.service.js'

/**
 * The tenant-scoped routes. Everything here reads the tenant from the
 * session, so a user can only ever see or act on their own tenant — the
 * client names no tenant anywhere.
 */
@Roles('owner')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly inviteCodes: InviteCodeService) {}

  /** Generates the code the next users of the tenant sign up with. */
  @Post('invite-codes')
  async createInviteCode(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(createInviteCodeSchema))
    body: CreateInviteCodeBody
  ): Promise<InviteCode> {
    const expiresAt =
      body.expiresInDays === undefined
        ? undefined
        : new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)

    const created = await this.inviteCodes.create(session.tenant.id, expiresAt)

    return {
      code: created.code,
      expiresAt: created.expiresAt?.toISOString() ?? null,
      createdAt: created.createdAt.toISOString(),
    }
  }

  /** Lists the codes the tenant has issued, newest first. */
  @Get('invite-codes')
  async listInviteCodes(
    @CurrentSession() session: Session
  ): Promise<InviteCode[]> {
    const rows = await this.inviteCodes.list(session.tenant.id)

    return rows.map((row) => ({
      code: row.code,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }))
  }
}
