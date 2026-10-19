import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common'
import type { TenantCode } from '@workspace/db'
import type { Session } from '../common/session/session.js'
import { CurrentSession, Roles } from '../common/session/session.js'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import {
  createInviteCodeSchema,
  type CreateInviteCodeBody,
  type InviteCode,
  type TenantUser,
} from '@workspace/poco'
import { InviteCodeService } from './invite-code.service.js'
import type { TenantUserRow } from './tenant-user.repository.js'
import { TenantUserService } from './tenant-user.service.js'

/**
 * The tenant-scoped routes, all owner-only: invite codes and the tenant's
 * users. Everything here reads the tenant from the session, so an owner can
 * only ever see or act on their own tenant — the client names no tenant
 * anywhere.
 */
@Roles('owner')
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly inviteCodes: InviteCodeService,
    private readonly tenantUsers: TenantUserService
  ) {}

  /** Generates the code the next users of the tenant sign up with. */
  @Post('invite-codes')
  async createInviteCode(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(createInviteCodeSchema))
    body: CreateInviteCodeBody
  ): Promise<InviteCode> {
    const created = await this.inviteCodes.create(
      session.tenant.id,
      body.expiresInDays
    )

    return toWireInviteCode(created)
  }

  /** Lists the codes the tenant has issued, newest first. */
  @Get('invite-codes')
  async listInviteCodes(
    @CurrentSession() session: Session
  ): Promise<InviteCode[]> {
    const rows = await this.inviteCodes.list(session.tenant.id)

    return rows.map(toWireInviteCode)
  }

  /** Revokes an open code: it expires now. */
  @HttpCode(204)
  @Delete('invite-codes/:id')
  async revokeInviteCode(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<void> {
    await this.inviteCodes.revoke(session.tenant.id, id)
  }

  /** Lists the tenant's users, removed ones included. */
  @Get('users')
  async listUsers(@CurrentSession() session: Session): Promise<TenantUser[]> {
    const rows = await this.tenantUsers.list(session.tenant.id)

    return rows.map(toWireUser)
  }

  /** Removes a user: inactive and signed out, their history intact. */
  @HttpCode(200)
  @Post('users/:id/deactivate')
  async deactivateUser(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<TenantUser> {
    const row = await this.tenantUsers.deactivate(
      session.tenant.id,
      session.user.id,
      id
    )

    return toWireUser(row)
  }

  /** Restores a removed user. */
  @HttpCode(200)
  @Post('users/:id/reactivate')
  async reactivateUser(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<TenantUser> {
    const row = await this.tenantUsers.reactivate(session.tenant.id, id)

    return toWireUser(row)
  }
}

/** Maps a code row onto its wire shape. */
function toWireInviteCode(row: TenantCode): InviteCode {
  return {
    id: row.id,
    code: row.code,
    usedAt: row.usedAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

/** Maps a user row onto its wire shape. */
function toWireUser(row: TenantUserRow): TenantUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  }
}
