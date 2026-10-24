import {
  type ArgumentsHost,
  Catch,
  ConflictException,
  type ExceptionFilter,
} from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'

/** Raised when a ledger write kept losing to concurrent writes on the same
 * accounts after every retry. */
export class LedgerConflictError extends Error {
  constructor(options?: { cause?: unknown }) {
    super(
      'Another change to these accounts happened at the same time. Try again.',
      options
    )
    this.name = 'LedgerConflictError'
  }
}

/**
 * Answers a ledger write that kept losing to concurrent writes on the same
 * accounts with a 409 the client can retry, instead of the 500 an uncaught
 * driver error would become.
 */
@Catch(LedgerConflictError)
export class LedgerConflictFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  catch(error: LedgerConflictError, host: ArgumentsHost): void {
    super.catch(new ConflictException(error.message), host)
  }
}
