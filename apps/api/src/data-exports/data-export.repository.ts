import { Injectable } from '@nestjs/common'
import { InjectDrizzle } from '@nestjs/drizzle'
import { and, asc, eq } from 'drizzle-orm'
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core'
import type { Database } from '@workspace/db'
import {
  accounts,
  auditLog,
  categories,
  creditCardStatements,
  goals,
  importMappings,
  limits,
  receivers,
  recurringTransactions,
  tenantSettings,
  tenants,
  transactionHistory,
  transactionLinkers,
  transactions,
  users,
} from '@workspace/db'

/** A table every tenant owns rows of, authored by a user. */
type TenantTable = PgTable & {
  id: AnyPgColumn
  tenantId: AnyPgColumn
  createdBy: AnyPgColumn
}

/**
 * The tenant entities an export carries, keyed by the file they land in.
 * Invite codes and password reset codes are left out on purpose: they are
 * credentials, not data. The order is the file order of the ZIP.
 */
const ENTITY_TABLES: Readonly<Record<string, TenantTable>> = {
  accounts,
  categories,
  receivers,
  limits,
  goals,
  'recurring-transactions': recurringTransactions,
  'transaction-linkers': transactionLinkers,
  'credit-card-statements': creditCardStatements,
  transactions,
  'transaction-history': transactionHistory,
  'import-mappings': importMappings,
}

/** The user columns an export may carry: never the password hash or the
 * refresh-token hash. */
const USER_COLUMNS = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  isActive: users.isActive,
  anonymizedAt: users.anonymizedAt,
  startPage: users.startPage,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
}

type Row = Record<string, unknown>

/**
 * Reads everything the full export packs. Each method takes the tenant
 * explicitly; the user rows are selected column by column so no secret can
 * leave with them.
 */
@Injectable()
export class DataExportRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /** Every file of a tenant export, keyed by file name (without `.json`). */
  async readTenant(tenantId: number): Promise<Record<string, Row[]>> {
    const files: Record<string, Row[]> = {
      tenant: await this.db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId)),
      settings: await this.db
        .select()
        .from(tenantSettings)
        .where(eq(tenantSettings.tenantId, tenantId)),
      users: await this.db
        .select(USER_COLUMNS)
        .from(users)
        .where(eq(users.tenantId, tenantId))
        .orderBy(asc(users.id)),
    }

    for (const [name, table] of Object.entries(ENTITY_TABLES)) {
      files[name] = await this.rowsOf(table, tenantId)
    }
    files['audit-log'] = await this.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.tenantId, tenantId))
      .orderBy(asc(auditLog.id))

    return files
  }

  /** Whether the user belongs to the tenant. */
  async hasUser(tenantId: number, userId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.id, userId)))

    return rows.length > 0
  }

  /** A member's profile and every row they created, keyed like a tenant
   * export. `undefined` when the user is not in the tenant. */
  async readMember(
    tenantId: number,
    userId: number
  ): Promise<Record<string, Row[]> | undefined> {
    const profile = await this.db
      .select(USER_COLUMNS)
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.id, userId)))
    if (profile.length === 0) {
      return undefined
    }

    const files: Record<string, Row[]> = { user: profile }
    for (const [name, table] of Object.entries(ENTITY_TABLES)) {
      files[name] = await this.rowsOf(table, tenantId, userId)
    }

    return files
  }

  private async rowsOf(
    table: TenantTable,
    tenantId: number,
    createdBy?: number
  ): Promise<Row[]> {
    const rows = await this.db
      .select()
      .from(table as PgTable)
      .where(
        and(
          eq(table.tenantId, tenantId),
          createdBy === undefined ? undefined : eq(table.createdBy, createdBy)
        )
      )
      .orderBy(asc(table.id))

    return rows as Row[]
  }
}
