import { and, eq } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { importMappings } from '@workspace/db'
import { importMappingSchema, type ImportMapping } from '@workspace/poco'

/**
 * The CSV mapping saved per account, reached only through the tenant of the
 * session. One row per account: saving again replaces it. The JSON column is
 * parsed with the poco schema on every read, so a mapping written by an older
 * shape is ignored instead of crashing a preview.
 */
export class ImportMappingRepository {
  constructor(private readonly db: Database) {}

  /** The account's saved mapping, or nothing when none was saved or the
   * stored one no longer fits the schema. */
  async find(
    tenantId: number,
    accountId: number
  ): Promise<ImportMapping | undefined> {
    const [row] = await this.db
      .select({ mapping: importMappings.mapping })
      .from(importMappings)
      .where(
        and(
          eq(importMappings.tenantId, tenantId),
          eq(importMappings.accountId, accountId),
          eq(importMappings.status, 'ACTIVE')
        )
      )

    const parsed = importMappingSchema.safeParse(row?.mapping)

    return parsed.success ? parsed.data : undefined
  }

  /** Saves the account's mapping, replacing the one before. */
  async save(
    tenantId: number,
    userId: number,
    accountId: number,
    mapping: ImportMapping
  ): Promise<void> {
    await this.db
      .insert(importMappings)
      .values({
        tenantId,
        accountId,
        mapping,
        createdBy: userId,
        updateBy: userId,
      })
      .onConflictDoUpdate({
        target: [importMappings.tenantId, importMappings.accountId],
        set: {
          mapping,
          status: 'ACTIVE',
          updateBy: userId,
          updateDt: new Date(),
        },
      })
  }
}
