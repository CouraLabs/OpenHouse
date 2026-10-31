import { and, eq } from 'drizzle-orm'
import type { ImportMapping } from '@workspace/domain'
import type { Database } from '../../database.js'
import { importMappings } from '../../schema.js'

export class ImportMappingRepository {
  constructor(private readonly db: Database) {}

  async findStored(tenantId: number, accountId: number): Promise<unknown> {
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

    return row?.mapping
  }

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
