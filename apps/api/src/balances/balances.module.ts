import { Module } from '@nestjs/common'

import { BalanceRepository } from './balance.repository.js'
import { BalanceService } from './balance.service.js'
import { BalancesController } from './balances.controller.js'

/**
 * Wires the balances feature: the ledger-derived reads (running balance,
 * end-of-day history) and the consistency check. The repository is exported
 * so the transaction search can join the running-balance window and the
 * accounts feature can recompute a balance from an opening balance — the
 * one sanctioned module-level crossing.
 */
@Module({
  controllers: [BalancesController],
  providers: [BalanceService, BalanceRepository],
  exports: [BalanceRepository],
})
export class BalancesModule {}
