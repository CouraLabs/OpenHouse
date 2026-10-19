import { Injectable } from '@nestjs/common'

/**
 * The source of "now" every service asks instead of calling `new Date()`.
 * An abstract class doubles as the injection token, so a spec hands a
 * service a fixed instant and the date logic becomes deterministic.
 */
export abstract class Clock {
  abstract now(): Date
}

/** The clock of a running process: the system time. */
@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date()
  }
}
