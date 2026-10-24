import { Module } from '@nestjs/common'

import { CreditCardStatementsModule } from '../credit-card-statements/credit-card-statements.module.js'
import { RecurringTransactionsModule } from '../recurring-transactions/recurring-transactions.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { CalendarFeedRepository } from './calendar-feed.repository.js'
import { CalendarController } from './calendar.controller.js'
import { CalendarService } from './calendar.service.js'

/** The secret `.ics` calendar feed of bills and recurring items. */
@Module({
  imports: [
    CreditCardStatementsModule,
    RecurringTransactionsModule,
    SettingsModule,
  ],
  controllers: [CalendarController],
  providers: [CalendarFeedRepository, CalendarService],
})
export class CalendarModule {}
