import { Global, Module } from '@nestjs/common'

import { Clock, SystemClock } from './clock.js'

/**
 * Provides the `Clock` everywhere. Global because time is infrastructure
 * every feature may need, like the database — not a domain dependency.
 */
@Global()
@Module({
  providers: [{ provide: Clock, useClass: SystemClock }],
  exports: [Clock],
})
export class ClockModule {}
