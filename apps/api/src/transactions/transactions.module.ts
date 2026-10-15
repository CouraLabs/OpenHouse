import { Module } from '@nestjs/common'

import { AccountsModule } from '../accounts/accounts.module.js'
import { CategoriesModule } from '../categories/categories.module.js'
import { ReceiversModule } from '../receivers/receivers.module.js'
import { TransactionRepository } from './transaction.repository.js'
import { TransactionService } from './transaction.service.js'
import { TransactionsController } from './transactions.controller.js'

/**
 * Wires the transactions feature: its routes and its two providers. The
 * accounts, categories, and receivers modules are imported so the service
 * can validate the references through the repositories they export — the
 * one sanctioned crossing between features. The repository is exported so
 * the recurring rules' cron can materialize transactions through it.
 */
@Module({
  imports: [AccountsModule, CategoriesModule, ReceiversModule],
  controllers: [TransactionsController],
  providers: [TransactionService, TransactionRepository],
  exports: [TransactionRepository],
})
export class TransactionsModule {}
