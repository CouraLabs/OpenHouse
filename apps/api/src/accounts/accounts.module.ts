import { Module } from '@nestjs/common'

import { AccountRepository } from './account.repository.js'
import { AccountService } from './account.service.js'
import { AccountsController } from './accounts.controller.js'

/** Wires the accounts feature: its routes and its two providers. The
 * repository is exported so another feature — the goals form validates its
 * linked account through it — can resolve the rows it owns. */
@Module({
  controllers: [AccountsController],
  providers: [AccountService, AccountRepository],
  exports: [AccountRepository],
})
export class AccountsModule {}
