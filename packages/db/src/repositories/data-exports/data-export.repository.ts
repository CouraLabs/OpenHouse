import { and, asc, eq } from 'drizzle-orm'
import type { AnySQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'
import type { Database } from '../../database.js'
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
  transactionSplits,
  transactions,
  users,
} from '../../schema.js'

type TenantTable = SQLiteTable & {
  id: AnySQLiteColumn
  tenantId: AnySQLiteColumn
  createdBy: AnySQLiteColumn
}

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
  'transaction-splits': transactionSplits,
  'transaction-history': transactionHistory,
  'import-mappings': importMappings,
}

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

export class DataExportRepository {
  constructor(private readonly db: Database) {}

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

  async hasUser(tenantId: number, userId: number): Promise<boolean> {
    const rows = await this.db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.id, userId)))

    return rows.length > 0
  }

  async timezoneOf(tenantId: number): Promise<string> {
    const [row] = await this.db
      .select({ timezone: tenantSettings.timezone })
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, tenantId))

    return row?.timezone ?? 'UTC'
  }

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
      .from(table as SQLiteTable)
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
