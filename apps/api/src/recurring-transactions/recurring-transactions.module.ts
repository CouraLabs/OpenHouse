import { Module } from '@nestjs/common'

import { AccountsModule } from '../accounts/accounts.module.js'
import { CategoriesModule } from '../categories/categories.module.js'
import { RecurringSource } from '../common/upcoming/upcoming-sources.js'
import { HouseholdModule } from '../household/household.module.js'
import { ReceiversModule } from '../receivers/receivers.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { TransactionsModule } from '../transactions/transactions.module.js'
import { RecurringRuleSource } from './recurring-rule.source.js'
import { RecurringRunService } from './recurring-run.service.js'
import { RecurringTransactionRepository } from './recurring-transaction.repository.js'
import { RecurringTransactionService } from './recurring-transaction.service.js'
import { RecurringTransactionsController } from './recurring-transactions.controller.js'

/**
 * Wires the recurring rules feature: its routes, its two CRUD providers,
 * and the background service that materializes due rules. The accounts,
 * categories, receivers, and transactions modules are imported so the
 * services can validate references and write transactions through the
 * repositories they export; the settings module so the job reads each
 * tenant's time zone. It provides the `RecurringSource` port the upcoming
 * list and the reminders read the rules through.
 */
@Module({
  imports: [
    AccountsModule,
    CategoriesModule,
    HouseholdModule,
    ReceiversModule,
    SettingsModule,
    TransactionsModule,
  ],
  controllers: [RecurringTransactionsController],
  providers: [
    RecurringTransactionService,
    RecurringTransactionRepository,
    RecurringRunService,
    RecurringRuleSource,
    { provide: RecurringSource, useExisting: RecurringRuleSource },
  ],
  exports: [RecurringTransactionRepository, RecurringSource],
})
export class RecurringTransactionsModule {}
