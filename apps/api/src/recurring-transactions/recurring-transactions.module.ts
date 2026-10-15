import { Module } from '@nestjs/common'

import { AccountsModule } from '../accounts/accounts.module.js'
import { CategoriesModule } from '../categories/categories.module.js'
import { ReceiversModule } from '../receivers/receivers.module.js'
import { TransactionsModule } from '../transactions/transactions.module.js'
import { RecurringRunService } from './recurring-run.service.js'
import { RecurringTransactionRepository } from './recurring-transaction.repository.js'
import { RecurringTransactionService } from './recurring-transaction.service.js'
import { RecurringTransactionsController } from './recurring-transactions.controller.js'

/**
 * Wires the recurring rules feature: its routes, its two CRUD providers,
 * and the background service that materializes due rules. The accounts,
 * categories, receivers, and transactions modules are imported so the
 * services can validate references and write transactions through the
 * repositories they export.
 */
@Module({
  imports: [AccountsModule, CategoriesModule, ReceiversModule, TransactionsModule],
  controllers: [RecurringTransactionsController],
  providers: [
    RecurringTransactionService,
    RecurringTransactionRepository,
    RecurringRunService,
  ],
  exports: [RecurringTransactionRepository],
})
export class RecurringTransactionsModule {}
