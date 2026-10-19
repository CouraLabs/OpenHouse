import { Module } from '@nestjs/common'

import { AccountsModule } from '../accounts/accounts.module.js'
import { CategoriesModule } from '../categories/categories.module.js'
import { CreditCardStatementsModule } from '../credit-card-statements/credit-card-statements.module.js'
import { ReceiversModule } from '../receivers/receivers.module.js'
import { TransactionRepository } from './transaction.repository.js'
import { TransactionService } from './transaction.service.js'
import { TransactionsController } from './transactions.controller.js'

/**
 * Wires the transactions feature: its routes and its two providers. The
 * accounts, categories, and receivers modules are imported so the service
 * can validate the references through the repositories they export — the
 * one sanctioned crossing between features. The bills module is imported
 * so every card row lands on its bill inside the ledger write. The repository is exported so
 * the recurring rules' cron can materialize transactions through it.
 */
@Module({
  imports: [
    AccountsModule,
    CategoriesModule,
    ReceiversModule,
    CreditCardStatementsModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionService, TransactionRepository],
  exports: [TransactionRepository],
})
export class TransactionsModule {}
