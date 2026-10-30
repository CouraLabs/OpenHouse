import type { Database } from '@workspace/db'

import { SystemClock } from '../common/clock/clock.js'
import type { App } from '../common/context.js'
import type { Config } from '../config/env.js'
import { CategoryRepository } from '../categories/category.repository.js'
import { ReceiverRepository } from '../receivers/receiver.repository.js'
import { TransactionLinkerRepository } from './transaction-linker.repository.js'
import { TransactionLinkerService } from './transaction-linker.service.js'
import { transactionLinkersRoutes } from './transaction-linkers.routes.js'

export interface TransactionLinkersDeps {
  router: App
}

export function transactionLinkersDeps(
  db: Database,
  _config: Config,
  _clock: SystemClock
): TransactionLinkersDeps {
  const linkers = new TransactionLinkerService(
    new TransactionLinkerRepository(db),
    new CategoryRepository(db),
    new ReceiverRepository(db)
  )

  return { router: transactionLinkersRoutes({ linkers }).router }
}
