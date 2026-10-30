import { and, eq } from 'drizzle-orm'
import type { Database } from '@workspace/db'
import { importMappings } from '@workspace/db'
import { importMappingSchema, type ImportMapping } from '@workspace/poco'

export class ImportMappingRepository {
  constructor(private readonly db: Database) {}

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
