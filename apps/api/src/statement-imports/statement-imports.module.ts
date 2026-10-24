import { Module } from '@nestjs/common'

import { AccountsModule } from '../accounts/accounts.module.js'
import { CategoriesModule } from '../categories/categories.module.js'
import { ReceiversModule } from '../receivers/receivers.module.js'
import { TransactionLinkersModule } from '../transaction-linkers/transaction-linkers.module.js'
import { TransactionsModule } from '../transactions/transactions.module.js'
import { ImportCommitService } from './import-commit.service.js'
import { ImportMappingRepository } from './import-mapping.repository.js'
import { ImportPreviewService } from './import-preview.service.js'
import { ImportTransactionRepository } from './import-transaction.repository.js'
import { StatementImportsController } from './statement-imports.controller.js'

/**
 * Wires the statement import feature: upload a bank file (OFX or CSV), preview
 * the parsed rows, commit the picked ones in one ledger transaction, undo a
 * batch. The rows are written through the transactions module's exported
 * repository — the same insert path every other write takes — and the
 * accounts, categories, receivers, and linkers modules are imported for
 * their exported repositories, the one sanctioned crossing between features.
 */
@Module({
  imports: [
    AccountsModule,
    CategoriesModule,
    ReceiversModule,
    TransactionLinkersModule,
    TransactionsModule,
  ],
  controllers: [StatementImportsController],
  providers: [
    ImportPreviewService,
    ImportCommitService,
    ImportMappingRepository,
    ImportTransactionRepository,
  ],
})
export class StatementImportsModule {}
