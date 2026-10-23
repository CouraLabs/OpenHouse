import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import type {
  Account,
  AccountRef,
  AccountType,
  CreateAccountBody,
  Currency,
  DeleteAccountQuery,
  EntityStatus,
  PagedResults,
  SearchAccountsArgs,
  UpdateAccountBody,
} from '@workspace/poco'
import {
  availableLimit,
  createAccountSchema,
  deleteAccountQuerySchema,
  searchAccountsSchema,
  updateAccountSchema,
} from '@workspace/poco'
import type { Session } from '../common/session/session.js'
import { CurrentSession } from '../common/session/session.js'
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js'

import { AccountService } from './account.service.js'

/**
 * The account routes. Everything here reads the tenant and the user from the
 * session, so a client can only ever see or act on its own tenant — the
 * request names no tenant anywhere. Every signed-in role manages accounts.
 */
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountService) {}

  /** Creates an account for the tenant. */
  @Post()
  async create(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(createAccountSchema)) body: CreateAccountBody
  ): Promise<Account> {
    return toWire(
      await this.accounts.create(session.tenant.id, session.user.id, body)
    )
  }

  /** Searches the tenant's accounts, paged, sorted and filtered. */
  @Post('search')
  async search(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(searchAccountsSchema)) args: SearchAccountsArgs
  ): Promise<PagedResults<Account>> {
    const { rows, total } = await this.accounts.search(session.tenant.id, args)

    return { total, items: rows.map(toWire) }
  }

  /** Lists the tenant's ACTIVE accounts by name, for pickers. The `type`
   * and the default flag ride along so a picker can offer only the kinds
   * it means — and start a new transaction in the default account. */
  @Get()
  async list(@CurrentSession() session: Session): Promise<AccountRef[]> {
    const rows = await this.accounts.listActive(session.tenant.id)

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      currency: row.currency,
      isDefault: row.isDefault,
      closeDay: row.closeDay,
      dueDay: row.dueDay,
      closeDayInclusive: row.closeDayInclusive,
      availableLimit: availableLimit(row),
    }))
  }

  /** Reads one account, deleted rows included. */
  @Get(':id')
  async find(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number
  ): Promise<Account> {
    return toWire(await this.accounts.find(session.tenant.id, id))
  }

  /** Updates an account. */
  @Put()
  async update(
    @CurrentSession() session: Session,
    @Body(new ZodValidationPipe(updateAccountSchema)) body: UpdateAccountBody
  ): Promise<Account> {
    return toWire(
      await this.accounts.update(session.tenant.id, session.user.id, body)
    )
  }

  /** Soft-deletes an account: its status becomes DELETED. */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @CurrentSession() session: Session,
    @Param('id', ParseIntPipe) id: number,
    @Query(new ZodValidationPipe(deleteAccountQuerySchema))
    query: DeleteAccountQuery
  ): Promise<void> {
    await this.accounts.softDelete(
      session.tenant.id,
      session.user.id,
      id,
      query.confirmUnpaidBills
    )
  }
}

/** Maps a row onto the wire shape: dates cross HTTP as ISO strings. */
function toWire(row: {
  id: number
  name: string
  agency: string | null
  number: string | null
  type: AccountType
  balance: string
  openingBalance: string
  openingDt: string
  reconciledThrough: string | null
  currency: Currency
  spreadPct: string
  limit: string | null
  closeDay: number | null
  dueDay: number | null
  closeDayInclusive: boolean
  isDefault: boolean
  status: EntityStatus
  createdDt: Date
  updateDt: Date
}): Account {
  return {
    id: row.id,
    name: row.name,
    agency: row.agency,
    number: row.number,
    type: row.type,
    balance: row.balance,
    openingBalance: row.openingBalance,
    openingDt: row.openingDt,
    reconciledThrough: row.reconciledThrough,
    currency: row.currency,
    spreadPct: row.spreadPct,
    limit: row.limit,
    availableLimit: availableLimit(row),
    closeDay: row.closeDay,
    dueDay: row.dueDay,
    closeDayInclusive: row.closeDayInclusive,
    isDefault: row.isDefault,
    status: row.status,
    createdDt: row.createdDt.toISOString(),
    updateDt: row.updateDt.toISOString(),
  }
}
