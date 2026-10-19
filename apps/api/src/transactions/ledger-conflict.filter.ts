import {
  type ArgumentsHost,
  Catch,
  ConflictException,
  type ExceptionFilter,
} from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'

import { LedgerConflictError } from './transaction-ledger.js'

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
