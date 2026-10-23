import { Module } from '@nestjs/common'

import { BalancesModule } from '../balances/balances.module.js'
import { CreditCardStatementsModule } from '../credit-card-statements/credit-card-statements.module.js'

import { AccountRepository } from './account.repository.js'
import { AccountService } from './account.service.js'
import { AccountsController } from './accounts.controller.js'

/** Wires the accounts feature: its routes and its two providers. The
 * repository is exported so another feature — the goals form validates its
 * linked account through it — can resolve the rows it owns. The bills
 * module provides the `CardCycleSync` port a card's day change calls, and
 * the bill repository the card-delete check reads. */
@Module({
  imports: [CreditCardStatementsModule, BalancesModule],
  controllers: [AccountsController],
  providers: [AccountService, AccountRepository],
  exports: [AccountRepository],
})
export class AccountsModule {}
