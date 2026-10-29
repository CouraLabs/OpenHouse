import type { Database } from '@workspace/db'

import { AccountRepository } from '../accounts/account.repository.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import { TransactionLinkerRepository } from '../transaction-linkers/transaction-linker.repository.js'
import { TransactionRepository } from '../transactions/transaction.repository.js'
import { CreditCardStatementRepository } from '../credit-card-statements/credit-card-statement.repository.js'
import { BalanceRepository } from '../balances/balance.repository.js'
import { SettingsRepository } from '../settings/settings.repository.js'
import { ImportCommitService } from './import-commit.service.js'
import { ImportMappingRepository } from './import-mapping.repository.js'
import { ImportPreviewService } from './import-preview.service.js'
import { ImportTransactionRepository } from './import-transaction.repository.js'
import { statementImportsRoutes } from './statement-imports.routes.js'

/** The statement import feature's wiring: its routes — the upload preview,
 * the commit, the recent batches, and the undo. */
export interface StatementImportsDeps {
  /** Mounted at `/imports`. */
  router: App
}

/**
 * Builds the statement import feature's services from the request's
 * dependencies — the explicit composition the DI module once did. The
 * services and repositories are cheap objects, rebuilt per request from the
 * same handles.
 */
export function statementImportsDeps(
  db: Database,
  /** Unused today — kept in the signature every deps builder shares, so a
   * rule that needs a secret or a ttl plugs in without a rewrite. */
  _config: Config,
  clock: SystemClock
): StatementImportsDeps {
  const accounts = new AccountRepository(db)
  const categories = new CategoryRepository(db)
  const receivers = new ReceiverRepository(db)
  const statements = new CreditCardStatementRepository(
    db,
    new SettingsRepository(db),
    clock
  )
  const ledger = new TransactionRepository(
    db,
    statements,
    new BalanceRepository(db)
  )
  const imports = new ImportTransactionRepository(db)
  const mappings = new ImportMappingRepository(db)

  const { router } = statementImportsRoutes({
    preview: new ImportPreviewService(
      accounts,
      categories,
      receivers,
      new TransactionLinkerRepository(db),
      imports,
      mappings
    ),
    commits: new ImportCommitService(
      db,
      ledger,
      imports,
      mappings,
      accounts,
      categories,
      receivers,
      clock
    ),
  })

  return { router }
}
