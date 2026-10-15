import { Module } from '@nestjs/common'

import { ReceiverRepository } from './receiver.repository.js'
import { ReceiverService } from './receiver.service.js'
import { ReceiversController } from './receivers.controller.js'

/**
 * Wires the receivers feature: its routes and its two providers. The
 * repository is exported so another feature — the transaction linkers
 * validate their receiver through it — can resolve the rows it owns.
 */
@Module({
  controllers: [ReceiversController],
  providers: [ReceiverService, ReceiverRepository],
  exports: [ReceiverRepository],
})
export class ReceiversModule {}
