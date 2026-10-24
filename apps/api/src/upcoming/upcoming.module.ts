import { Module } from '@nestjs/common'

import { AccountsModule } from '../accounts/accounts.module.js'
import { CreditCardStatementsModule } from '../credit-card-statements/credit-card-statements.module.js'
import { GoalsModule } from '../goals/goals.module.js'
import { LimitsModule } from '../limits/limits.module.js'
import { RecurringTransactionsModule } from '../recurring-transactions/recurring-transactions.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { UpcomingController } from './upcoming.controller.js'
import { UpcomingService } from './upcoming.service.js'

/**
 * The Upcoming panel: merges card bills, recurring rules, limits and goals.
 * It reads the four through the ports their modules export (`BillSource`,
 * `RecurringSource`, `LimitSource`, `GoalSource`) and the accounts through
 * the repository the accounts module exports.
 */
@Module({
  imports: [
    AccountsModule,
    CreditCardStatementsModule,
    GoalsModule,
    LimitsModule,
    RecurringTransactionsModule,
    SettingsModule,
  ],
  controllers: [UpcomingController],
  providers: [UpcomingService],
})
export class UpcomingModule {}
