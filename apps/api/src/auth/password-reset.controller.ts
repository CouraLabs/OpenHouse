import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common'
import {
  issueResetCodeSchema,
  type AccountSecurity,
  type IssueResetCodeBody,
  type IssuedResetCode,
  type RecoveryCodes,
} from '@workspace/poco'

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'
import {
  CurrentSession,
  Roles,
  type Session,
} from '../common/session/session.js'
import { PasswordResetService } from './password-reset.service.js'

/**
 * The signed-in side of password recovery without email: an owner issuing
 * a member's reset code, an owner generating recovery codes, and every
 * user reading — and acknowledging — what happened to their account's
 * recovery. Redeeming a code lives with the sign-in routes, since it starts
 * a session. Codes are answered once; only their hashes are stored.
 */
@Controller('auth')
export class PasswordResetController {
  constructor(private readonly passwordResets: PasswordResetService) {}

  /** Issues a one-time, 30-minute reset code for a member of the tenant. */
  @Roles('owner')
  @Post('password/reset-codes')
  async issueResetCode(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(issueResetCodeSchema)) body: IssueResetCodeBody
  ): Promise<IssuedResetCode> {
    const issued = await this.passwordResets.issueForMember(
      session.tenant.id,
      session.user.id,
      body.userId
    )

    return { code: issued.code, expiresAt: issued.expiresAt.toISOString() }
  }

  /** Generates the owner's 10 recovery codes; the previous set stops
   * working. */
  @Roles('owner')
  @Post('recovery-codes')
  async generateRecoveryCodes(
    @CurrentSession() session: Session
  ): Promise<RecoveryCodes> {
    return {
      codes: await this.passwordResets.generateRecoveryCodes(session.user.id),
    }
  }

  /** The signed-in user's recovery codes left and unacknowledged
   * server-issued resets. */
  @Get('security')
  security(@CurrentSession() session: Session): Promise<AccountSecurity> {
    return this.passwordResets.security(session.user.id)
  }

  /** Acknowledges the notices of server-issued resets. */
  @HttpCode(204)
  @Post('security/notices/seen')
  async acknowledgeNotices(@CurrentSession() session: Session): Promise<void> {
    await this.passwordResets.acknowledgeServerNotices(session.user.id)
  }
}
