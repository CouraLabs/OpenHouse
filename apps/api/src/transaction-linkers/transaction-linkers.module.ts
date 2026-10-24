import { Module } from '@nestjs/common'

import { CategoriesModule } from '../categories/categories.module.js'
import { ReceiversModule } from '../receivers/receivers.module.js'
import { TransactionLinkerRepository } from './transaction-linker.repository.js'
import { TransactionLinkerService } from './transaction-linker.service.js'
import { TransactionLinkersController } from './transaction-linkers.controller.js'

/**
 * Wires the transaction linkers feature: its routes and its two providers.
 * The categories and receivers modules are imported so the service can
 * validate the references through the repositories they export — the one
 * sanctioned crossing between features. The repository is exported so the
 * statement import can suggest a row's category and receiver from the
 * linkers.
 */
@Module({
  imports: [CategoriesModule, ReceiversModule],
  controllers: [TransactionLinkersController],
  providers: [TransactionLinkerService, TransactionLinkerRepository],
  exports: [TransactionLinkerRepository],
})
export class TransactionLinkersModule {}
