import { Module } from '@nestjs/common'

import { CardCycleSync } from '../common/card-cycle/card-cycle-sync.js'
import { BillSource } from '../common/upcoming/upcoming-sources.js'
import { SettingsModule } from '../settings/settings.module.js'
import { CreditCardStatementRepository } from './credit-card-statement.repository.js'
import { CreditCardStatementService } from './credit-card-statement.service.js'
import { CreditCardStatementsController } from './credit-card-statements.controller.js'
import { StatementBillSource } from './statement-bill.source.js'
import { StatementCycleSyncService } from './statement-cycle-sync.service.js'

/**
 * Wires the credit card bills. It reads the accounts and transactions
 * tables through the shared schema and imports no other feature but
 * settings (each tenant's time zone), so nothing cycles back into it. It
 * exports the repository — the transactions feature places every card row
 * on its bill through it — and provides the `CardCycleSync` port the
 * accounts feature calls when a card's days change, and the `BillSource`
 * port the upcoming list and the reminder cron read the pending bills from.
 */
@Module({
  imports: [SettingsModule],
  controllers: [CreditCardStatementsController],
  providers: [
    CreditCardStatementRepository,
    CreditCardStatementService,
    StatementCycleSyncService,
    StatementBillSource,
    { provide: CardCycleSync, useExisting: StatementCycleSyncService },
    { provide: BillSource, useExisting: StatementBillSource },
  ],
  exports: [CreditCardStatementRepository, CardCycleSync, BillSource],
})
export class CreditCardStatementsModule {}
