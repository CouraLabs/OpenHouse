import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module.js'
import { InviteCodeService } from './invite-code.service.js'
import { TenantUserRepository } from './tenant-user.repository.js'
import { TenantUserService } from './tenant-user.service.js'
import { TenantsController } from './tenants.controller.js'

/**
 * The tenant routes: the invite codes an owner hands out and the users an
 * owner manages. The tenant context comes from `AuthModule`'s session,
 * never from the request.
 */
@Module({
  imports: [AuthModule],
  controllers: [TenantsController],
  providers: [InviteCodeService, TenantUserRepository, TenantUserService],
})
export class TenantsModule {}
