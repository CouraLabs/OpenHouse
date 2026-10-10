import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { InviteCodeService } from './invite-code.service.js'
import { TenantsController } from './tenants.controller.js'

/**
 * The tenant routes: generating and listing the invite codes an owner hands
 * out. The tenant context comes from `AuthModule`'s session, never from the
 * request.
 */
@Module({
  imports: [AuthModule],
  controllers: [TenantsController],
  providers: [InviteCodeService],
})
export class TenantsModule {}
